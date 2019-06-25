const assert = require('assert')
const solc = require('solc')
const ganache = require('ganache-cli')

const {
    Contract,
    Wallet,
    ContractFactory,
    getDefaultProvider,
} = require('ethers')

const code = `
    pragma solidity ^0.4.24;
    contract Example {
        event Return(uint256);

        uint256 _accum = 0;

        function increment() returns (uint256 sum) {
            _accum++;
            Return(_accum);
        }
    }
`
const comp = solc.compile(code)
const { bytecode, interface } = comp.contracts[':Example']
const privateKey = '0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0'
const provider = getDefaultProvider('ropsten')
provider.pollingInterval = 100

const wallet = new Wallet(privateKey, provider)

const abi = [
    'event Return(uint256)',
    'function increment() returns (uint256 sum)'
]

async function deploy() {
    console.log('Deploying the contract...')
    const deployer = new ContractFactory(abi, bytecode, wallet)
    const contract = await deployer.deploy()
    await contract.deployed()
    return contract.address
}

async function increment(contractAddress) {
    console.log(`Send a transaction to the contract at ${contractAddress}`)
    const contract = new Contract(contractAddress, abi, wallet)

    // Call the contract, getting back the transaction
    let tx = await contract.increment()

    // Wait for the transaction to have 2 confirmations.
    // See the note below on "Economic Value" for considerations
    // regarding the number of suggested confirmations
    let receipt = await tx.wait(2)

    // The receipt will have an "events" Array, which will have
    // the emitted event from the Contract. The "Return(uint256)"
    // call is the last event.
    let sumEvent = receipt.events.pop()

    // Not necessary; these are just for the purpose of this
    // example
    assert.equal(sumEvent.event, 'Return')
    assert.equal(sumEvent.eventSignature, 'Return(uint256)')

    // The sum is the first (and in this case only) parameter
    // in the "Return(uint256 sum)" event
    let sum = sumEvent.args[0]

    return sum
}

const server = ganache.server()
server.listen(8545, () => {
    console.log('Ganache started')
    deploy()
    .then(increment)
    .then((value) => {
        console.log(`Result: ${value.toString()}`)
        server.close()
    })
})
