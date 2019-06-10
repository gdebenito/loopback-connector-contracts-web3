const { initialize } = require('..');
const Web3 = require('web3');

// console.log(initialize);

(async () => {
	let datasource = {};
	datasource.settings = require('./datasource.3.json')

	initialize(datasource)

	const SimpleStorage = datasource.connector.contracts.get('SimpleStorage')
	const sendTrx = SimpleStorage.methods.setHash('1', '1', '1').send();
	const request = await SimpleStorage.methods.getHash('1', '1').call();
	console.log(request);

	const Migrations = datasource.connector.contracts.get('Migrations')
	const request2 = await Migrations.methods.owner().call();
	console.log(request2);
})()