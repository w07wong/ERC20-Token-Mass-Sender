#!/usr/bin/env node

'use strict';

var ArgumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var ini = require('ini');
var _ = require('lodash');
var pjson = require('../package.json');
var fastCSV = require('fast-csv');
var Web3 = require('web3');
var configFile = require('../config.js');
var Tx = require('ethereumjs-tx');
var prompt = require('prompt');

//web3 implementation
var web3 = new Web3();
var eth = web3.eth;
var eToken = web3.eth.contract(configFile.abi).at(configFile.address);
web3.setProvider(new web3.providers.HttpProvider(configFile.gethNode));

const ERC20_MASS_SENDER = pjson.version;

//vars for csv
let _csvAddresses = [];
let _csvAmounts = [];

let privateKey;
let gasPrice;
let gasLimit;
let nonce;
let offset;
let batchSize;
let tokenDecimal;
let tokenMultiplier;

class MassSender {
    constructor() {}

    getArgs(args) {

        let parser = new ArgumentParser({
            version: ERC20_MASS_SENDER,
            addHelp: true,
            description: 'ERC20 Mass Sender'
        });

        //configuration
        parser.addArgument(
          ['--config'], {
                help: 'Specify configuration file (default: ../config.js)',
                metavar: 'path',
            }
        );

        //wallet
        parser.addArgument(
          ['--wallet'], {
                help: 'Specify a ethereum wallet file.',
                metavar: 'path',
            }
        );

        //csv
        parser.addArgument(
          ['--csv'], {
                help: 'Specify a CSV file with Ethereum addresses and amounts.',
                metavar: 'path',
            }
        );

        //contract address
        parser.addArgument(
          ['--address'], {
                help: 'Specify a sending ERC20 contract address',
                metavar: 'address',
            }
        );

        //token decimals
        parser.addArgument(
          ['--decimal'], {
                help: 'Specify the amount of ERC20 token decimals',
                metavar: 'num',
            }
        );

        //offset
        parser.addArgument(
          ['--offset'], {
                help: 'Specify a sending offset for the CSV file (default: 0)',
                metavar: 'num',
            }
        );

        //batch size
        parser.addArgument(
          ['--batch'], {
                help: 'Specify a batch size or how many transactions to send (default: to the end of CSV file)',
                metavar: 'num',
            }
        );

        //gas price
        parser.addArgument(
          ['--gasPrice'], {
                help: 'Specify gas price (wei)',
                metavar: 'num',
            }
        );

        //gas limit
        parser.addArgument(
          ['--gasLimit'], {
                help: 'Specify gas limit (wei)',
                metavar: 'num',
            }
        );

        return parser.parseArgs(args);
    }

    /*getConfig(configFileParam) {
        let iniData;
        try {
            iniData = fs.readFileSync(configFileParam || '../config.js', 'utf-8');
        } catch (err) {
            //Only throw on failure to read if configuration file was expilicitly specified
            if (configFileParam) {
                throw new Error("Could not read config file " + configFileParam);
            }
        }
        return iniData ? ini.parse(iniData) : {};
    }*/

    //Gets user wallet's address
    getWalletAddr(pathName) {
        let walletJSON;
        try {
            walletJSON = fs.readFileSync(pathName);
        } catch (err) {
            throw new Error('Could not read wallet file' + pathName);
        }
        return JSON.parse(walletJSON).address;
    }

    getWalletBalance(wallAddr) {
        var balance = web3.eth.getBalance(wallAddr);
        return balance.toNumber();
    }

    checkRequiredParams(walletVar, cavVar, addressVar, gasPriceVar, gasLimitVar) {
        let paramArr = [walletVar, cavVar, addressVar, gasPriceVar, gasLimitVar];
        for (var p in paramArr) {
            if (paramArr[p] == null || paramArr[p] === '' || paramArr[p] == undefined)
                console.log('Missing a ' + paramArr[p]);
        }
    }

    enactTransaction(addresses, amounts) {

        console.log('Running transaction...');

        prompt.start();
        prompt.get({
            properties: {
                privateKey: {
                    description: "Enter your wallet's private key:",
                    hidden: true,
                    conform: function (value) {
                        return true;
                    }
                }
            }
        }, function (err, result) {
            //save inputs
            privateKey = new Buffer(result.privateKey.toString(), 'hex');
            console.log('Your private key will be deleted once transaction finishes.');

            let transactionCount = 0;
            nonce = web3.eth.getTransactionCount(web3.eth.defaultAccount);

            batchSize === '' ? batchSize = addresses.length : batchSize = batchSize;

            for (var i = offset; i < addresses.length; i++) {
                if (transactionCount < batchSize) {

                    //nonce
                    nonce++;
                    var nonceHex = web3.toHex(nonce);

                    //recipient address
                    var toAddressHex = web3.toHex(addresses[i]);

                    //amount to send
                    var valueAmount = amounts[i] * tokenMultiplier;
                    var valueAmountHex = web3.toHex(valueAmount);

                    //transaction object
                    var rawTx = {
                        nonce: nonceHex,
                        gasPrice: gasPrice,
                        gasLimit: gasLimit,
                        to: toAddressHex,
                        from: web3.eth.defaultAccount,
                        value: valueAmountHex,
                        data: ''
                    }

                    var tx = new Tx(rawTx);
                    tx.sign(privateKey);

                    var serializedTx = tx.serialize();

                    //send
                    web3.eth.sendRawTransaction(`0x${serializedTx.toString('hex')}`, function (err, hash) {
                        if (err)
                            console.log(err);
                        else
                            console.log(hash);
                    });

                    transactionCount++;

                } else {
                    i == addresses.length;
                    console.log('Transactions sent.');
                }
            }

            //delete private key
            privateKey = '';

            //uncheck ready in config
            configFile.ready = false;

        });
    };

    run(argString) {

        //defaults that get overriden by command line entries
        let defaults = {
            wallet: '',
            csv: '',
            address: '',
            decimal: '',
            offset: '',
            batch: '',
            gasPrice: '',
            gasLimit: '',
            config: '../config.js'
        };

        //Parse command line args
        let args = this.getArgs(argString && argString.split(' '));

        //Get config file (depends on command line arg --config)
        //let parsedConfig = this.getConfig(args.config);

        if (args.config != null) configFile = require(args.config);
        //Config file overrides default options listed in this method
        //_.assign(defaults, parsedConfig);

        _.keys(defaults).forEach(k => {
            defaults[k] = configFile[k];
        });

        //Command line args override config file args - keys creates an array of the input
        _.keys(args).forEach(k => {
            //parseArgs sets missing values to null
            if (args[k] !== null) {
                defaults[k] = args[k];
            }
        });

        defaults.address = this.getWalletAddr(defaults.wallet.toString());
        //fs.writeFileSync('../resources/config.conf', ini.stringify(defaults, {}))

        //Reads CSV, stores variables
        fastCSV
            .fromPath(defaults.csv, {
                ignoreEmpty: true
            })
            .on('data', function (data) {
                _csvAddresses.push(data[0]);
                _csvAmounts.push(data[1]);
            });

        //sets the default account (sender account)
        web3.eth.defaultAccount = `0x${defaults.address}`;

        //sets the offset
        offset = defaults.offset;

        //sets the batch size
        batchSize = defaults.batch;

        //sets the gas price
        gasPrice = web3.toHex(defaults.gasPrice);

        //sets the gas limit
        gasLimit = web3.toHex(defaults.gasLimit);

        //sets the token decimal & multiplier to send fractional amounts
        tokenDecimal = defaults.decimal;
        tokenMultiplier = Math.pow(10, tokenDecimal * (-1));

        //if the user is ready, set a arg to true, then run transaction method
        if (this.checkRequiredParams(defaults.wallet, defaults.csv, defaults.address, defaults.gasLimit, defaults.gasPrice)) {

            prompt.start();
            prompt.get({
                properties: {
                    proceed: {
                        description: "Would you like to proceed with the transaction? (y/n)"
                    }
                }
            }, function (err, result) {
                if (result.proceed.toLowerCase() === 'y')
                    enactTransaction(_csvAddresses, _csvAmounts);
            });
        }
    }
}

module.exports = MassSender;
