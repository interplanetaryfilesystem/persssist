import type { NextPage } from 'next'
import Head from 'next/head'
import Web3 from 'web3'
import { useEffect, useState } from 'react'
import { create } from 'ipfs-http-client'
import Persssist from '../public/abis/Persssist.json'
import { NavBar } from '../components/navbar/Navbar'
import { Projects } from '../components/projects/Projects'
import "antd/dist/antd.css";
import { Header } from '../components/header/header'
import { PersssistFile } from '../interfaces/persssist-file.interface'

const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
declare let window: any;

const contractAddress = '0x89c096ef23d6644ddf65c72f7fd48cae843dd261';

// dynamic import
let untar: any;

const Home: NextPage = () => {
  const [account, setAccount] = useState<string>();
  const [contract, setContract] = useState<any>();
  const [files, setFiles] = useState<PersssistFile[]>([]);

  useEffect(() => {
    const loadDynamicModules = async () => {
      untar = await require("js-untar");
    }

    const loadWeb3 = async () => {
      window.ipfs = ipfs;
      if (window.ethereum) {
        window.web3 = new Web3(window.ethereum)
        await window.ethereum.enable()
      } 
      else if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider)
      }
      else {
        window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
      }
    }

    loadDynamicModules();
    loadWeb3().then(() => loadBlockchainData());
  }, [])

  useEffect(() => {
    const loadFiles = async () => {
      if(!contract) return;
      const filesCount = await contract.methods.fileCount().call()
      const fetchedFiles = [];
      for (var i = filesCount; i >= 1; i--) {
        const file = await contract.methods.files(i).call()
        fetchedFiles.push(file);
      }
      setFiles([...fetchedFiles]);
    }

    const subscribeToEvents = () => {
      if(!contract) return;
      contract.events.FileUploaded()
        .on('data', (event: any) => loadFiles())
        .on('changed', (changed: any) => console.log(changed))
        .on('error', (err: any) => console.log(err))
        .on('connected', (str: any) => loadFiles())
    }

    subscribeToEvents();
  }, [contract]);



  const loadBlockchainData = async () => {
    const web3 = window.web3;
    const acc: string[] = await window.ethereum.request({ method: "eth_accounts" });
    setAccount(acc[0]);
    const persssistContract = new web3.eth.Contract((Persssist as any), contractAddress)
    setContract(persssistContract);
  }

  const downloadFile = async (file: PersssistFile) => {
    const iterable = ipfs.get(file.filePath);

    var chunks: Uint8Array[] = [];
    for await (const b of iterable) {
      chunks.push(b);
    }

    const tarball = new Blob(chunks, { type: 'application/x-tar' })
    const tarAsArrayBuffer = await tarball.arrayBuffer();
    const result = await untar(tarAsArrayBuffer);
    const resultFile = new Blob([result[0].buffer], { type: file.fileType })

    var url = window.URL.createObjectURL(resultFile);
    downloadURL(url, file.fileName);

  }
  const downloadURL = (data: any, fileName: string) => {
    var a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };


  return (
    <div>
      <Head>
        <title>Persssist</title>
        <meta name="description" content="Desentralized storage for free and forever" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <NavBar></NavBar>
      <Header contract={contract} ipfs={ipfs} account={account}></Header>
      <Projects files={files} onDownload={downloadFile} contract={contract} ipfs={ipfs} account={account}></Projects>
    </div>
  )
}


export default Home
