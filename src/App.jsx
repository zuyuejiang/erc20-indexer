import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
  Spinner
} from '@chakra-ui/react';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
const DEFAULT_ICON = './coin.png';
// import dotenv from 'dotenv';
// dotenv.config();

function App() {
  const [userAddress, setUserAddress] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  // const [results, setResults] = useState([]);
  const [results, setResults] = useState({ tokenBalances: [] });
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // const [ALCHEMY_API_KEY] = process.env;

  useEffect(() => {
    const interval = setInterval(() => {
      if (resolvedAddress) {
        getTokenBalance();
      }
    }, 30000); // Fetch data every 30 seconds
    return () => clearInterval(interval);
  }, [resolvedAddress]);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install it to use this feature.');
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);
      setResolvedAddress(address);
    } catch (err) {
      setError(err.message || 'An error occurred while connecting the wallet.');
    }
  }

  function formatBalance(balance, decimals) {
    const formatted = Utils.formatUnits(balance, decimals);
    const number = parseFloat(formatted);
    if (number >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
    if (number >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
    if (number >= 1e3) return `${(number / 1e3).toFixed(2)}K`;
    return number.toFixed(2);
  }

  async function resolveENSorAddress(input) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        'https://eth-mainnet.g.alchemy.com/v2/Xq23Kn_d8n4PLXmBVePyb1cc4-H6J-yX' // Replace with your Infura or Alchemy endpoint
      );

      if (input.endsWith('.eth')) {
        const address = await provider.resolveName(input);
        if (!address) throw new Error('Unable to resolve ENS domain.');
        return address;
      }
      return input;
    } catch (err) {
      throw new Error('Error resolving ENS or address: ' + err.message);
    }
  }

  async function getTokenBalance() {
    const config = {
      apiKey: 'Xq23Kn_d8n4PLXmBVePyb1cc4-H6J-yX',
      network: Network.ETH_MAINNET,
    };
    const alchemy = new Alchemy(config);
    setLoading(true);
    setError('');
    setResolvedAddress('');
    setResults({ tokenBalances: [] });
    setTokenDataObjects([]);
    // setResolvedAddress('');
    try {
      // const resolved = resolvedAddress || (await resolveENSorAddress(userAddress));
      const resolved = await resolveENSorAddress(userAddress);
      setResolvedAddress(resolved);
      if (!alchemy.core.isContractAddress(resolved)) {
        throw new Error('Invalid Ethereum address.');
      }
      // const data = await alchemy.core.getTokenBalances(userAddress);
      const data = await alchemy.core.getTokenBalances(resolved);
      setResults(data);

      const uniqueContracts = new Set();
      data.tokenBalances.forEach(balance => uniqueContracts.add(balance.contractAddress));

      const tokenDataPromises = Array.from(uniqueContracts).map(contractAddress =>
        alchemy.core.getTokenMetadata(contractAddress)
      );

      setTokenDataObjects(await Promise.all(tokenDataPromises));
      setHasQueried(true);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setError(error.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }

  function exportData(format) {
    if (!hasQueried || results.tokenBalances.length === 0) {
      setError('No data to export. Please make a query first.');
      return;
    }

    const exportData = results.tokenBalances.map((e, i) => ({
      symbol: tokenDataObjects[i]?.symbol || 'N/A',
      balance: formatBalance(e.tokenBalance, tokenDataObjects[i]?.decimals || 18),
      contractAddress: e.contractAddress,
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'token-balances.json';
      link.click();
    } else if (format === 'csv') {
      const csvContent = [
        'Symbol,Balance,Contract Address',
        ...exportData.map(row => `${row.symbol},${row.balance},${row.contractAddress}`),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'token-balances.csv';
      link.click();
    }
  }

  return (
    <Box w="100vw">
      <Center>
        <Flex
          alignItems={'center'}
          justifyContent="center"
          flexDirection={'column'}
        >
          <Heading mb={0} fontSize={36}>ERC-20 Token Indexer</Heading>
          <Text>
            Plug in an address or ENS domain, connect your wallet, and this website will return
            all of its ERC-20 token balances!
          </Text>
        </Flex>
      </Center>
      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={'center'}
      >
        <Heading mt={42}>
          Get all the ERC-20 token balances of this address or ENS domain:
        </Heading>
        <Input
          onChange={(e) => setUserAddress(e.target.value)}
          color="black"
          w="600px"
          textAlign="center"
          p={4}
          bgColor="white"
          fontSize={24}
          placeholder="Enter address or ENS domain"
        />
        <Button fontSize={20} onClick={getTokenBalance} mt={36} bgColor="#747498">
          Check ERC-20 Token Balances
        </Button>
        <Button fontSize={20} onClick={connectWallet} mt={4} bgColor="#C6CFE4">
          Connect Wallet
        </Button>

        <Button fontSize={20} onClick={() => exportData('json')} mt={4} bgColor="green.500">
          Export as JSON
        </Button>
        <Button fontSize={20} onClick={() => exportData('csv')} mt={4} bgColor="yellow.500">
          Export as CSV
        </Button>

        {loading && (
          <Flex mt={4} alignItems="center" justifyContent="center">
            <Spinner size="lg" color="blue.500" />
            <Text ml={4}>Loading...</Text>
          </Flex>
        )}

        {error && (
          <Text mt={4} color="red.500">
            {error}
          </Text>
        )}

        {resolvedAddress && (
          <Text mt={4} color="green.500">
            Resolved Address: {resolvedAddress}
          </Text>
        )}

        <Heading my={36}>ERC-20 token balances:</Heading>

        {hasQueried ? (
          <SimpleGrid w={'90vw'} columns={5} spacing={8}>
            {results.tokenBalances && results.tokenBalances.map((e, i) => {
              return (
                <Flex
                  flexDir={'column'}
                  color="black"
                  bg="gray.800"
                  borderRadius="md"
                  boxShadow="lg"
                  p={4}
                  w={'100%'}
                  key={e.contractAddress}
                  alignItems="center"
                  justifyContent="space-between"
                  textAlign="center"
                  _hover={{ transform: 'scale(1.05)', transition: '0.3s' }}
                >
                  <Box mb={4}>
                    <b>Symbol:</b> ${tokenDataObjects[i]?.symbol || 'N/A'}
                  </Box>
                  <Box mb={4}>
                    <b>Balance:</b>
                    {/* {Utils.formatUnits( */}
                    {formatBalance(
                      e.tokenBalance,
                      tokenDataObjects[i]?.decimals || 18
                    )}
                  </Box>
                  {/* <Image src={tokenDataObjects[i]?.logo || ''} /> */}
                  <Image
                    src={tokenDataObjects[i]?.logo || DEFAULT_ICON}
                    alt={tokenDataObjects[i]?.symbol || 'Token'}
                    boxSize="50px"
                    borderRadius="full"
                    objectFit="cover"
                    border="2px solid white"
                  />
                </Flex>
              );
            })}
          </SimpleGrid>
        ) : (
          !loading && 'Please make a query! This may take a few seconds...'
        )}
      </Flex>
    </Box>
  );
}

export default App;
