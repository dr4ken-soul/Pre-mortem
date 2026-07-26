import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { Contract, Interface, JsonRpcProvider, ZeroAddress, formatUnits, id, isAddress } from 'ethers';
import fetch from 'node-fetch';
import type { AnalysisRequest, LensOutput } from './types.js';

const ABI_WORDS = ['owner', 'mint', 'pause', 'blacklist', 'blocklist', 'upgradeTo', 'implementation', 'timelock'];
const TRANSFER_TOPIC = id('Transfer(address,address,uint256)');
const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function owner() view returns (address)',
];
const OWNER_INTERFACE = new Interface(['function owner() view returns (address)']);
// Vercel instances can only write to /tmp. Local development keeps using the
// project cache directory so the existing workflow remains unchanged.
const cacheRoot = process.env.VERCEL ? path.join('/tmp', 'premortem-cache') : path.resolve(process.cwd(), 'cache');

type SourceLookup = {
  source: string;
  abi: string;
  verified: boolean;
  provider: string;
  status?: string;
  contractName?: string;
  compilerType?: string;
  compilerVersion?: string;
  optimization?: string;
  optimizationRuns?: string;
  evmVersion?: string;
  proxy?: string;
  implementation?: string;
};

type OklinkMarket = {
  topThreePercent: number | null;
  holderCount: number | null;
  priceUsd: string | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
};

function providerFor(chain: AnalysisRequest['chainId']) {
  const configured = chain === 'xlayer' ? process.env.XLAYER_RPC_URL : process.env.BASE_RPC_URL;
  if (configured === '') return null;
  const url = configured || (chain === 'xlayer' ? 'https://rpc.xlayer.tech' : 'https://mainnet.base.org');
  return new JsonRpcProvider(url);
}

async function withTimeout<T>(promise: Promise<T>, ms = 7000) {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('RPC request timed out.')), ms))]);
}

async function oklinkSource(address: string): Promise<SourceLookup | null> {
  const apiKey = process.env.OKLINK_API_KEY;
  const secretKey = process.env.OKLINK_SECRET_KEY;
  const passphrase = process.env.OKLINK_PASSPHRASE;
  if (!apiKey || !secretKey || !passphrase) return null;

  const requestPath = `/api/v5/xlayer/contract/verify-contract-info?chainShortName=XLAYER&contractAddress=${encodeURIComponent(address)}`;
  const timestamp = new Date().toISOString();
  const signature = createHmac('sha256', secretKey).update(`${timestamp}GET${requestPath}`).digest('base64');
  try {
    const response = await withTimeout(fetch(`https://web3.okx.com${requestPath}`, {
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-PASSPHRASE': passphrase,
        'OK-ACCESS-TIMESTAMP': timestamp,
      },
    }));
    if (!response.ok) return { source: '', abi: '', verified: false, provider: 'OKLink', status: `HTTP ${response.status}` };
    const json = await response.json() as { code?: string; data?: Array<{
      sourceCode?: string;
      contractAbi?: string;
      contractName?: string;
      compilerType?: string;
      compilerVersion?: string;
      optimization?: string;
      optimizationRuns?: string;
      evmVersion?: string;
      proxy?: string;
      implementation?: string;
    }> };
    if (json.code !== '0') return { source: '', abi: '', verified: false, provider: 'OKLink', status: `API code ${json.code ?? 'unknown'}` };
    const item = json.data?.[0];
    if (!item) return { source: '', abi: '', verified: false, provider: 'OKLink', status: 'no verified source returned' };
    return {
      source: item?.sourceCode ?? '',
      abi: item?.contractAbi ?? '',
      verified: Boolean(item?.sourceCode || item?.contractAbi),
      provider: 'OKLink',
      contractName: item?.contractName,
      compilerType: item?.compilerType,
      compilerVersion: item?.compilerVersion,
      optimization: item?.optimization,
      optimizationRuns: item?.optimizationRuns,
      evmVersion: item?.evmVersion,
      proxy: item?.proxy,
      implementation: item?.implementation,
    };
  } catch (error) {
    return { source: '', abi: '', verified: false, provider: 'OKLink', status: error instanceof Error ? 'request failed' : 'request failed' };
  }
}

async function oklinkMarket(address: string, chain: AnalysisRequest['chainId']): Promise<OklinkMarket | null> {
  const apiKey = process.env.OKLINK_API_KEY;
  const secretKey = process.env.OKLINK_SECRET_KEY;
  const passphrase = process.env.OKLINK_PASSPHRASE;
  if (!apiKey || !secretKey || !passphrase || chain !== 'xlayer') return null;
  const accessKey = apiKey;
  const signingKey = secretKey;
  const accessPassphrase = passphrase;

  async function request<T>(requestPath: string, method: 'GET' | 'POST' = 'GET', body?: string): Promise<T | null> {
    const timestamp = new Date().toISOString();
    const signature = createHmac('sha256', signingKey).update(`${timestamp}${method}${requestPath}${body ?? ''}`).digest('base64');
    try {
      const response = await withTimeout(fetch(`https://web3.okx.com${requestPath}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          'OK-ACCESS-KEY': accessKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-PASSPHRASE': accessPassphrase,
          'OK-ACCESS-TIMESTAMP': timestamp,
        },
        body,
      }));
      if (!response.ok) return null;
      const json = await response.json() as { code?: string; data?: T };
      return json.code === '0' ? (json.data ?? null) : null;
    } catch { return null; }
  }

  const [holderData, tokenData] = await Promise.all([
    request<Array<{ circulatingSupply?: string; positionList?: Array<{ amount?: string }> }>>(`/api/v5/xlayer/token/position-list?chainShortName=XLAYER&tokenContractAddress=${encodeURIComponent(address)}&limit=50`),
    request<Array<{ tokenList?: Array<{ addressCount?: string; price?: string; transactionAmount24h?: string; tvl?: string; totalMarketCap?: string }> }>>(`/api/v5/xlayer/token/token-list?chainShortName=XLAYER&tokenContractAddress=${encodeURIComponent(address)}&limit=1`),
  ]);
  const priceInfo = await request<Array<{
    price?: string;
    marketCap?: string;
    liquidity?: string;
    volume24h?: string;
    holders?: string;
  }>>('/api/v6/dex/market/price-info', 'POST', JSON.stringify([{ chainIndex: '196', tokenContractAddress: address.toLowerCase() }]));
  const positions = holderData?.[0]?.positionList ?? [];
  const token = tokenData?.[0]?.tokenList?.[0];
  const circulatingSupply = Number(holderData?.[0]?.circulatingSupply);
  const topAmount = positions.slice(0, 3).reduce((sum, position) => sum + Number(position.amount ?? 0), 0);
  const market = priceInfo?.[0];
  return {
    topThreePercent: circulatingSupply > 0 && positions.length ? Math.round((topAmount / circulatingSupply) * 10000) / 100 : null,
    holderCount: market?.holders ? Number(market.holders) : token?.addressCount ? Number(token.addressCount) : null,
    priceUsd: market?.price ?? token?.price ?? null,
    volume24h: market?.volume24h ? Number(market.volume24h) : token?.transactionAmount24h ? Number(token.transactionAmount24h) : null,
    liquidityUsd: market?.liquidity ? Number(market.liquidity) : token?.tvl ? Number(token.tvl) : null,
    marketCapUsd: market?.marketCap ? Number(market.marketCap) : token?.totalMarketCap ? Number(token.totalMarketCap) : null,
  };
}

async function explorerSource(address: string, chain: AnalysisRequest['chainId']): Promise<SourceLookup | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY;
  if (apiKey && chain === 'base') {
    const url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    try {
      const response = await withTimeout(fetch(url));
      const json = await response.json() as { result?: Array<{
        SourceCode?: string;
        ABI?: string;
        ContractName?: string;
        CompilerType?: string;
        CompilerVersion?: string;
        OptimizationUsed?: string;
        Runs?: string;
        EVMVersion?: string;
        Proxy?: string;
        Implementation?: string;
      }> };
      const item = json.result?.[0];
      return {
        source: item?.SourceCode ?? '',
        abi: item?.ABI ?? '',
        verified: Boolean(item?.SourceCode),
        provider: 'Etherscan/Base',
        contractName: item?.ContractName,
        compilerType: item?.CompilerType,
        compilerVersion: item?.CompilerVersion,
        optimization: item?.OptimizationUsed,
        optimizationRuns: item?.Runs,
        evmVersion: item?.EVMVersion,
        proxy: item?.Proxy,
        implementation: item?.Implementation,
      };
    } catch { return { source: '', abi: '', verified: false, provider: 'Etherscan/Base' }; }
  }
  if (chain === 'xlayer') {
    const source = await oklinkSource(address);
    if (source) return source;
  }
  const chainNumber = chain === 'base' ? '8453' : '196';
  try {
    const response = await withTimeout(fetch(`https://sourcify.dev/server/v2/contract/${chainNumber}/${address}`));
    if (!response.ok) return null;
    const json = await response.json() as { match?: string; runtimeMatch?: string };
    const verified = json.match === 'match' || json.runtimeMatch === 'match';
    return { source: '', abi: '', verified, provider: 'Sourcify' };
  } catch { return null; }
}

function hasAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function unavailableLens(lens: LensOutput['lens'], summary: string): LensOutput {
  return { lens, score: null, findings: [{ key: 'DATA_STATUS', value: 'unavailable', riskWeight: 0 }], summary };
}

export async function contractLens(request: AnalysisRequest): Promise<LensOutput> {
  const provider = providerFor(request.chainId);
  if (!provider) return unavailableLens('contract', 'RPC is not configured for the selected chain.');

  let bytecode = '';
  let ownerRenounced: boolean | null = null;
  try {
    bytecode = await withTimeout(provider.getCode(request.contractAddress));
  } catch {
    return unavailableLens('contract', 'The selected RPC did not return contract bytecode.');
  }

  if (!bytecode || bytecode === '0x') {
    return {
      lens: 'contract',
      score: 100,
      findings: [
        { key: 'DEPLOYED_CODE', value: 'not found', riskWeight: 70 },
        { key: 'SOURCE_VERIFIED', value: 'not applicable', riskWeight: 0 },
      ],
      summary: `No deployed contract bytecode was found on ${request.chainId}.`,
    };
  }

  const source = await explorerSource(request.contractAddress, request.chainId);
  const sourceText = `${source?.source ?? ''} ${source?.abi ?? ''}`;
  const hasSourceText = sourceText.trim().length > 0;
  const sourceChecked = Boolean(source);
  const verified = Boolean(source?.verified);
  const providerProxy = source?.proxy === '1' || source?.proxy?.toLowerCase() === 'true'
    ? true
    : source?.proxy === '0' || source?.proxy?.toLowerCase() === 'false'
      ? false
      : null;
  try {
    const result = await withTimeout(provider.call({ to: request.contractAddress, data: OWNER_INTERFACE.encodeFunctionData('owner') }));
    const decoded = OWNER_INTERFACE.decodeFunctionResult('owner', result)[0] as string;
    ownerRenounced = decoded.toLowerCase() === ZeroAddress.toLowerCase();
  } catch { ownerRenounced = null; }

  const ownerMint = hasSourceText ? hasAny(sourceText, ['mint(', 'mint (', 'ownerMint', 'mintTo']) : null;
  const pause = hasSourceText ? hasAny(sourceText, ['pause(', 'pause (']) : null;
  const proxy = providerProxy ?? (hasSourceText ? hasAny(sourceText, ['delegatecall', 'upgradeTo', 'transparentupgradeable', 'uups']) : null);
  const blacklist = hasSourceText ? hasAny(sourceText, ['blacklist', 'blocklist']) : null;
  const timelock = hasSourceText ? hasAny(sourceText, ['timelock']) : null;
  const findings = [
    { key: 'DEPLOYED_CODE', value: 'found', riskWeight: 0 },
    { key: 'SOURCE_VERIFIED', value: verified ? `verified via ${source?.provider ?? 'provider'}` : sourceChecked ? `not verified${source?.status ? ` (${source.status})` : ''}` : 'not checked', riskWeight: sourceChecked && !verified ? 22 : 0 },
    { key: 'OWNER_MINT', value: ownerMint === null ? 'unknown' : ownerMint ? 'true' : 'false', riskWeight: ownerMint ? 28 : 0 },
    { key: 'PAUSE_FN', value: pause === null ? 'unknown' : pause ? 'present' : 'none', riskWeight: pause ? 8 : 0 },
    { key: 'PROXY', value: proxy === null ? 'unknown' : proxy ? 'upgradeable' : 'none', riskWeight: proxy ? 16 : 0 },
    { key: 'BLACKLIST', value: blacklist === null ? 'unknown' : blacklist ? 'present' : 'none', riskWeight: blacklist ? 12 : 0 },
    { key: 'TIMELOCK', value: timelock === null ? 'unknown' : timelock ? 'present' : 'none', riskWeight: timelock === false ? 9 : 0 },
    { key: 'OWNERSHIP_RENOUNCED', value: ownerRenounced === null ? 'unknown' : ownerRenounced ? 'renounced' : 'active', riskWeight: ownerRenounced === false ? 12 : 0 },
    { key: 'CONTRACT_NAME', value: source?.contractName || 'unavailable', riskWeight: 0 },
    { key: 'COMPILER', value: source?.compilerVersion || 'unavailable', riskWeight: 0 },
    { key: 'OPTIMISATION', value: source?.optimization ? `${source.optimization === '1' ? 'enabled' : 'disabled'}${source.optimizationRuns ? `, ${source.optimizationRuns} runs` : ''}` : 'unavailable', riskWeight: 0 },
    { key: 'IMPLEMENTATION', value: source?.implementation || (proxy === true ? 'not returned' : 'not applicable'), riskWeight: 0 },
  ];
  const score = Math.min(100, findings.reduce((total, finding) => total + (finding.riskWeight ?? 0), 0));
  const metadataSummary = verified && source
    ? ` Provider ${source.provider}; compiler ${source.compilerVersion || 'not returned'}; optimisation ${source.optimization === '1' ? 'enabled' : source.optimization === '0' ? 'disabled' : 'not returned'}; proxy ${proxy === true ? 'yes' : proxy === false ? 'no' : 'unknown'}${source.implementation ? `; implementation ${source.implementation}` : ''}.`
    : '';
  const summary = ownerMint === true
    ? `Verified source exposes a mint path. Ownership is ${ownerRenounced === true ? 'renounced' : ownerRenounced === false ? 'active' : 'not readable'}.${metadataSummary}`
    : verified && !hasSourceText
      ? `Contract bytecode found. Source verified by ${source?.provider}; source text was not returned to this scan.`
      : verified
        ? `Source verified. ${proxy ? 'An upgradeable pattern was detected.' : 'No mint path was detected in the verified source.'}${metadataSummary}`
        : `Contract bytecode found. Source is ${sourceChecked ? 'not verified' : 'not checked'} on the selected explorer.`;
  return { lens: 'contract', score, findings, summary };
}

async function moralisMarket(address: string, chain: AnalysisRequest['chainId']) {
  if (!process.env.MORALIS_API_KEY || chain !== 'base') return null;
  const moralisChain = '0x2105';
  try {
    const response = await withTimeout(fetch(`https://deep-index.moralis.io/api/v2.2/erc20/${address}/owners?chain=${moralisChain}&limit=10`, { headers: { 'X-API-Key': process.env.MORALIS_API_KEY } }));
    if (!response.ok) return null;
    return await response.json() as { result?: Array<{ owner_address?: string; percentage_relative_to_total_supply?: string }> };
  } catch { return null; }
}

async function dexLiquidity(address: string, chain: AnalysisRequest['chainId']) {
  try {
    const response = await withTimeout(fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`));
    if (!response.ok) return null;
    const json = await response.json() as { pairs?: Array<{ chainId?: string; priceUsd?: string; baseToken?: { address?: string }; quoteToken?: { address?: string }; liquidity?: { usd?: number }; marketCap?: number; fdv?: number; volume?: { h24?: number }; txns?: { h24?: { buys?: number; sells?: number } } }> };
    const expected = chain === 'base' ? ['base'] : ['xlayer', 'x-layer'];
    const tokenAddress = address.toLowerCase();
    const pairs = (json.pairs ?? []).filter((pair) => expected.includes(pair.chainId ?? '') && (pair.baseToken?.address?.toLowerCase() === tokenAddress || pair.quoteToken?.address?.toLowerCase() === tokenAddress));
    const pair = pairs.sort((left, right) => (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0))[0];
    if (!pair?.liquidity?.usd) return null;
    const marketCap = pair.marketCap || pair.fdv || 0;
    return {
      liquidityUsd: pair.liquidity.usd,
      ratio: marketCap ? (pair.liquidity.usd / marketCap) * 100 : null,
      priceUsd: pair.priceUsd ?? null,
      volume24h: pair.volume?.h24 ?? null,
      buys24h: pair.txns?.h24?.buys ?? null,
      sells24h: pair.txns?.h24?.sells ?? null,
    };
  } catch { return null; }
}

function topicAddress(topic: string | undefined) {
  return topic ? `0x${topic.slice(-40)}` : null;
}

async function recentTransferData(provider: JsonRpcProvider, address: string, chain: AnalysisRequest['chainId'], ownerAddress: string | null) {
  try {
    const latest = await withTimeout(provider.getBlockNumber());
    const span = chain === 'base' ? 2_000 : 1_000;
    const chunk = 100;
    const logs = [];
    let successfulChunks = 0;
    for (let fromBlock = Math.max(0, latest - span); fromBlock <= latest; fromBlock += chunk + 1) {
      const toBlock = Math.min(latest, fromBlock + chunk);
      try {
        const result = await withTimeout(provider.getLogs({ address, topics: [TRANSFER_TOPIC], fromBlock, toBlock }), 8_000);
        logs.push(...result);
        successfulChunks += 1;
      } catch { }
    }
    if (!successfulChunks) return null;
    const addresses = new Set<string>();
    let ownerTransfers = 0;
    for (const log of logs) {
      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      if (from) { addresses.add(from); if (ownerAddress && from.toLowerCase() === ownerAddress.toLowerCase()) ownerTransfers += 1; }
      if (to) addresses.add(to);
    }
    return { logs, addresses: [...addresses].slice(0, 120), ownerTransfers };
  } catch { return null; }
}

export async function marketLens(request: AnalysisRequest): Promise<LensOutput> {
  const provider = providerFor(request.chainId);
  if (!provider) return unavailableLens('market', 'RPC is not configured for the selected chain.');

  let totalSupply: bigint;
  let decimals = 18;
  let ownerAddress: string | null = null;
  try {
    const token = new Contract(request.contractAddress, ERC20_ABI, provider);
    totalSupply = await withTimeout(token.totalSupply() as Promise<bigint>);
    decimals = Number(await withTimeout(token.decimals() as Promise<bigint>));
    try { ownerAddress = await withTimeout(token.owner() as Promise<string>); } catch { ownerAddress = null; }
  } catch {
    return unavailableLens('market', 'The address does not expose readable ERC-20 supply data.');
  }

  const transfers = await recentTransferData(provider, request.contractAddress, request.chainId, ownerAddress);
  const [liveHolders, oklinkData] = await Promise.all([
    moralisMarket(request.contractAddress, request.chainId),
    oklinkMarket(request.contractAddress, request.chainId),
  ]);
  let topThree: number | null = null;
  if (liveHolders?.result?.length) {
    topThree = Math.round(liveHolders.result.slice(0, 3).reduce((sum, holder) => sum + Number(holder.percentage_relative_to_total_supply ?? 0), 0));
  } else if (oklinkData?.topThreePercent != null) {
    topThree = oklinkData.topThreePercent;
  } else if (transfers?.addresses.length) {
    const token = new Contract(request.contractAddress, ERC20_ABI, provider);
    const balances = await Promise.all(transfers.addresses.slice(0, 60).map(async (holder) => {
      try { return await withTimeout(token.balanceOf(holder) as Promise<bigint>); } catch { return 0n; }
    }));
    balances.sort((left, right) => (right > left ? 1 : right < left ? -1 : 0));
    const nonZeroBalances = balances.filter((balance) => balance > 0n);
    if (totalSupply > 0n && nonZeroBalances.length) topThree = Math.round(Number((nonZeroBalances.slice(0, 3).reduce((sum, value) => sum + value, 0n) * 10000n) / totalSupply) / 100);
  }
  const liquidity = await dexLiquidity(request.contractAddress, request.chainId);
  const effectiveLiquidity = liquidity ?? (oklinkData && oklinkData.liquidityUsd !== null && oklinkData.marketCapUsd
    ? {
      liquidityUsd: oklinkData.liquidityUsd,
      ratio: (oklinkData.liquidityUsd / oklinkData.marketCapUsd) * 100,
      priceUsd: oklinkData.priceUsd,
      volume24h: oklinkData.volume24h,
      buys24h: null,
      sells24h: null,
    }
    : null);
  const recentCount = transfers?.logs.length ?? null;
  const scoreParts = [
    topThree === null ? 0 : topThree > 55 ? 35 : topThree > 35 ? 18 : 0,
    effectiveLiquidity?.ratio === null || effectiveLiquidity === null ? 0 : effectiveLiquidity.ratio < 2 ? 25 : effectiveLiquidity.ratio < 8 ? 12 : 0,
    transfers?.ownerTransfers && transfers.ownerTransfers > 0 ? 20 : 0,
  ];
  const holderUnavailableValue = liveHolders || oklinkData ? 'unavailable' : 'indexer needed';
  const findings = [
    { key: 'TOP_HOLDERS', value: topThree === null ? holderUnavailableValue : `${topThree}pct observed`, riskWeight: scoreParts[0] },
    { key: 'RECENT_TRANSFERS', value: recentCount === null ? 'unavailable' : `${recentCount} observed`, riskWeight: 0 },
    { key: 'LP_DEPTH', value: effectiveLiquidity?.ratio === null || effectiveLiquidity === null ? 'unavailable' : `${Math.round(effectiveLiquidity.ratio)}pct`, riskWeight: scoreParts[1] },
    { key: 'PRICE_24H', value: effectiveLiquidity?.priceUsd === null || effectiveLiquidity === null ? 'unavailable' : `$${effectiveLiquidity.priceUsd}`, riskWeight: 0 },
    { key: 'VOLUME_24H', value: effectiveLiquidity?.volume24h === null || effectiveLiquidity === null ? 'unavailable' : `$${Math.round(effectiveLiquidity.volume24h).toLocaleString('en-GB')}`, riskWeight: 0 },
    { key: 'OWNER_MOVES', value: transfers?.ownerTransfers ? `${transfers.ownerTransfers} observed` : 'none observed', riskWeight: scoreParts[2] },
  ];
  const score = Math.min(100, scoreParts.reduce((sum, value) => sum + value, 0));
  const holderText = topThree === null ? 'Top holder concentration needs a holder indexer' : `the observed top three holders represent about ${topThree} percent`;
  const liquidityText = effectiveLiquidity?.ratio === null || effectiveLiquidity === null ? 'DEX liquidity was unavailable' : `DEX liquidity is about ${Math.round(effectiveLiquidity.ratio)} percent of the available market-cap estimate`;
  const marketText = effectiveLiquidity?.priceUsd && effectiveLiquidity.volume24h ? `Price is $${effectiveLiquidity.priceUsd} with $${Math.round(effectiveLiquidity.volume24h).toLocaleString('en-GB')} volume over 24 hours.` : 'Price and 24 hour volume were unavailable.';
  return { lens: 'market', score, findings, summary: `${holderText}; ${liquidityText}. ${recentCount === null ? 'Transfer activity was unavailable.' : `${recentCount} recent transfer events were observed.`} ${marketText}` };
}

function extractPercentages(text: string) {
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
}

function extractMonths(text: string) {
  return [...text.matchAll(/(\d+)\s*(?:months?|mos?|weeks?)/gi)].map((match) => Number(match[1]));
}

export async function supplyLens(request: AnalysisRequest): Promise<LensOutput> {
  if (!request.supplyDataRaw && !request.supplyImageBase64) return { lens: 'supply', score: null, findings: [], summary: 'Add a vesting schedule to complete supply analysis.' };
  if (request.supplyImageBase64 && !request.supplyDataRaw) return { lens: 'supply', score: null, findings: [], summary: 'Image received. Paste the schedule text for deterministic supply parsing.' };
  const text = request.supplyDataRaw ?? '';
  const percentages = extractPercentages(text);
  const months = extractMonths(text);
  if (!percentages.length) return { lens: 'supply', score: null, findings: [], summary: 'The schedule text did not contain a percentage allocation.' };
  const totalAllocation = percentages.reduce((sum, value) => sum + value, 0);
  const unlockSix = Math.min(100, Math.round((percentages[0] ?? 0) + (percentages[1] ?? 0)));
  const unlockThree = Math.min(unlockSix, Math.round((percentages[0] ?? 0) * 0.6));
  const unlockTwelve = Math.min(100, Math.max(unlockSix, Math.round(totalAllocation * 0.9)));
  const hasNoCliff = /no\s+(?:vesting\s+)?cliff|cliff\s*[:=]\s*0/iu.test(text);
  const hasCliff = /cliff/iu.test(text);
  const teamMatch = /team[^\d]*(\d+(?:\.\d+)?)\s*%/iu.exec(text);
  const teamAllocation = teamMatch ? Number(teamMatch[1]) : null;
  const findings = [
    { key: 'UNLOCK_3M', value: `${unlockThree}pct`, riskWeight: unlockThree > 15 ? 18 : 5 },
    { key: 'UNLOCK_6M', value: `${unlockSix}pct`, riskWeight: unlockSix > 25 ? 28 : 10 },
    { key: 'UNLOCK_12M', value: `${unlockTwelve}pct`, riskWeight: unlockTwelve > 45 ? 16 : 6 },
    { key: 'CLIFF', value: hasNoCliff ? 'none' : hasCliff ? 'present' : 'unknown', riskWeight: hasNoCliff ? 20 : 0 },
    { key: 'TEAM_ALLOC', value: teamAllocation === null ? 'unknown' : `${teamAllocation}pct`, riskWeight: teamAllocation !== null && teamAllocation > 20 ? 18 : 0 },
  ];
  const score = Math.min(100, findings.reduce((total, finding) => total + (finding.riskWeight ?? 0), 0));
  const timing = months.length ? `${months[0]} month schedule` : 'schedule duration not stated';
  return { lens: 'supply', score, findings, summary: `${unlockSix} percent unlocks across the first two stated allocations. ${hasNoCliff ? 'No vesting cliff was stated.' : hasCliff ? 'A vesting cliff was stated.' : 'Cliff data was not stated.'} ${timing} parsed.` };
}

export async function ensureCacheDirs() {
  await mkdir(path.join(cacheRoot, 'audio'), { recursive: true });
  await mkdir(path.join(cacheRoot, 'cards'), { recursive: true });
}

export function cachePath(kind: 'audio' | 'cards', address: string, chain: string, extension: string) {
  return path.join(cacheRoot, kind, `${address.toLowerCase()}-${chain}.${extension}`);
}

export async function readCached(filePath: string) {
  try { return await readFile(filePath); } catch { return null; }
}

export { writeFile };
