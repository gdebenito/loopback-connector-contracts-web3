'use-strict';

// Strong Globalize is a library to make the application multilanguage
var g = require('strong-globalize')();

// Import Web3
var Web3 = require('web3');

// Import truffle hdwallet provider
var HDWalletProvider = require('truffle-hdwallet-provider');

// Import filesystem module for read mnemonic from file
var fs = require('fs');

// var debug = require('debug')('loopback:connector:web3');

/**
 * Initializes the connector
 * @param {} dataSource 
 * @param {Function} [callback] callback
 */
module.exports = exports = ContractConnector;

/**
 * @constructor
 * Creates the contract connector
 * @param {} settings 
 * The Datasource settings are the datasource.json object
 * 
 */
function ContractConnector(settings) {

	if (!settings.provider) {
		throw new Error(g.f('{{settings.provider}} must exist. Check {{datasource.json}}'));
	}

	if (typeof settings.provider !== 'string') {
		throw new Error(g.f('{{settings.provider}} must be type of {{string}}. Check {{datasource.json}}'));
	}

	if (settings.mnemonic) {
		if (typeof settings.mnemonic !== 'object') {
			throw new Error(g.f('{{settings.mnemonic}} must be type of {{object}}. Check {{datasource.json}}'));
		}

		if (!settings.mnemonic.method) {
			throw new Error(g.f('{{settings.mnemonic.method}} must exist {{string}}. Can be "raw" or "file". Check {{datasource.json}}'));
		}

		if (typeof settings.mnemonic.method !== 'string') {
			throw new Error(g.f('{{settings.mnemonic.method}} must be type of {{string}}. Check {{datasource.json}}'));
		}

		if (settings.mnemonic.method !== 'raw' && settings.mnemonic.method !== 'file') {
			throw new Error(g.f('{{settings.mnemonic.method}} must be "raw" or "file". Check {{datasource.json}}'));
		}

		if (!settings.mnemonic.value) {
			throw new Error(g.f('{{settings.mnemonic.value}} must exist. Check {{datasource.json}}'));
		}

		if (typeof settings.mnemonic.value !== 'string') {
			throw new Error(g.f('{{settings.mnemonic.value}} must be type of {{string}}. Check {{datasource.json}}'));
		}

	}


	if (!settings.contracts) {
		throw new Error(g.f('{{settings.contracts}} must exist. Check {{datasource.json}}'));
	}

	if (settings.contracts.constructor !== Array) {
		throw new Error(g.f('{{settings.contracts}} must be type of {{Array}}. Check {{datasource.json}}'));
	}

	this.contractsOptions = new Map();

	for (let i = 0; i < settings.contracts.length; i++) {

		const contractOptions = settings.contracts[i];

		if (!contractOptions) {
			throw new Error(g.f('{{settings.contracts}} with index %d empty. Check {{datasource.json}}', i));
		}

		if (!contractOptions.contractName) {
			throw new Error(g.f('{{settings.contracts.contractName}} with index %d empty. Check {{datasource.json}}', i));
		}

		if (!contractOptions.abi.constructor) {
			throw new Error(g.f('{{settings.contracts.abi}} with index %d empty. Check {{datasource.json}}', i));
		}

		if (contractOptions.abi.constructor !== Array) {
			throw new Error(g.f('{{settings.contracts.abi}} with index %d must be type of {{Array}}. Check {{datasource.json}}', i));
		}

		if (!contractOptions.address) {
			throw new Error(g.f('{{contractOptions.address}} with index %d must exist. Check {{datasource.json}}', i));
		}

		if (typeof contractOptions.address !== 'string') {
			throw new Error(g.f('{{contractOptions.address}} with index %d must be type of {{string}}. Check {{datasource.json}}', i));
		}

		if (contractOptions.options) {
			if (typeof contractOptions.options !== 'object') {
				throw new Error(g.f('{{contractOptions.options}} with index %d must be type of {{object}}. Check {{datasource.json}}', i));
			}
		}

		if (this.contractsOptions.has(contractOptions.contractName)) {
			throw new Error(g.f('{{contractOptions.contractName}} %s is already defined. Check {{datasource.json}}', contractOptions.contractName));
		} else {

			this.contractsOptions.set(
				contractOptions.contractName,
				contractOptions
			)

		}

	}




	// If mnemonic is set
	if (settings.mnemonic) {

		var mnemonic;

		if (settings.mnemonic.method === 'file') {

			if (fs.existsSync(settings.mnemonic.value)) {

				var stats = fs.statSync(settings.mnemonic.value);

				if (stats.isFile()) {

					// Read mnemonic from file
					mnemonic = fs.readFileSync(settings.mnemonic.value, { encoding: 'utf8' });

				} else {

					throw new Error(g.f('{{settings.mnemonic.value}} is not a file. Check {{datasource.json}}'));
				}

			} else {

				throw new Error(g.f('{{settings.mnemonic.value}} path does not exist. Check {{datasource.json}}'));

			}

		} else if (settings.mnemonic.method === 'raw') {

			mnemonic = settings.mnemonic.value;

		}

		// Use truffle Hardware Wallet Provider
		this.provider = new HDWalletProvider(mnemonic, settings.provider)

	} else {

		this.provider = settings.provider;

	}

};

ContractConnector.initialize = function (dataSource, callback) {

	if (typeof dataSource !== 'object') {
		throw new Error(g.f('{{dataSource}} must be type of {{object}}'));
	}

	var connector = dataSource.connector =
		new ContractConnector(dataSource.settings);

	connector.getDataAccessObject();

	dataSource.connector.dataSource = dataSource;

	/**
	 * Is required because the loopback legacy
	 */
	if (callback) {
		process.nextTick(callback);
	}

}


ContractConnector.prototype.connect = async function (callback) {

	/**
	 * When the web socket is listening ( from CONNECTING --> OPEN ) 
	 * will execute the callback. More info at: 
	 * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket#Constants
	 */
	await this.DataAccessObject.web3.eth.net.isListening();

	/**
	 * It's necessary to call the callback because loopback sends a callback and 
	 * must be resolved to change state of the connector to 'connected state'
	 */
	callback();

}

ContractConnector.prototype.disconnect = ContractConnector.prototype.close =
	async function (callback) {
		// Websocket close connection
		await this.DataAccessObject.web3.currentProvider.connection.close();
		// When is closed
		callback();
	}


/**
 * @returns {Object}
 */
ContractConnector.prototype.getDataAccessObject = function () {

	// If the instance already exists
	if (this.DataAccessObject) {
		return this.DataAccessObject;
	}

	var self = this;
	var DataAccessObject = function () { };

	var web3 = DataAccessObject.web3 = new Web3(this.provider);

	this.contracts = new Map();

	for (const contractOption of this.contractsOptions.values()) {

		const { address, abi, contractName, options } = contractOption;

		this.contracts.set(
			contractName,
			new web3.eth.Contract(abi, address, options)
		);

	}

	self.DataAccessObject = DataAccessObject;

	return self.DataAccessObject;
}
