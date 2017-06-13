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

const TEST_VERSION = pjson.version;

//vars for csv
let _csvData = [];
let _csvAddresses = [];
let _csvAmounts = [];
let _csvIndex = 0;

let privateKey;
let gasPrice;
let gasLimit;
let nonce;

class TypeCommand {
    constructor() {}

    getArgs(args) {

        let parser = new ArgumentParser({
            version: TEST_VERSION,
            addHelp: true,
            description: 'Test'
        });

        //configuration
        parser.addArgument(
          ['--conf'], {
                help: 'Specify configuration file (default: ../resources/config.conf)',
                metavar: 'path',
            }
        );

        //wallet
        parser.addArgument(
          ['--wall'], {
                help: 'Specify file with MyEtherWallet encrypted JSON container',
                metavar: 'path',
            }
        );

        //csv
        parser.addArgument(
          ['--csv'], {
                help: 'Specify CSV file with Ethereum addresses and amounts. CSV must be formatted like so: "address,amount,address,amount" which each amount corresponding to the preceeding address.',
                metavar: 'path',
            }
        );

        //contract address
        parser.addArgument(
          ['--addr'], {
                help: 'Specify ERC20 contract address',
                metavar: 'address',
            }
        );

        //token decimals
        parser.addArgument(
          ['--deci'], {
                help: 'Specify ERC20 token decimals',
                metavar: 'num',
            }
        );

        //offset
        parser.addArgument(
          ['--offs'], {
                help: 'Specify offset in CSV file, to start sendings from (default: 0)',
                metavar: 'num',
            }
        );

        //batch size
        parser.addArgument(
          ['--batc'], {
                help: 'Specify batch size (how many transactions to send, default: to the end of CSV file)',
                metavar: 'num',
            }
        );

        //ready to run transaction?
        parser.addArgument(
          ['--tready'], {
                help: 'Set to true if ready to begin sending',
                metavar: 'string',
            }
        );

        //TODO: add password argument

        return parser.parseArgs(args);
    }

    getConfig(configFile) {
        let iniData;
        try {
            iniData = fs.readFileSync(configFile || '../resources/config.conf', 'utf-8');
        } catch (err) {
            //Only throw on failure to read if configuration file was expilicitly specified
            if (configFile) {
                throw new Error("Could not read config file " + configFile);
            }
        }
        return iniData ? ini.parse(iniData) : {};
    }

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

    enactTransaction() {

        prompt.start();

        prompt.get([{
            name: 'gas_price',
            required: true
        }, {
            name: 'gas_limit',
            required: true
        }, {
            name: 'wallet_private_key',
            hidden: true,
            conform: function (value) {
                return true;
            }
        }], function (err, result) {
            //save inputs
            gasPrice = result.gas_price.toString();
            gasLimit = result.gas_limit.toString();
            privateKey = new Buffer(result.wallet_private_key.toString(), 'hex');

            var rawTx = {
                nonce: '0x00',
                gasPrice: gasPrice,
                gasLimit: gasLimit,
                to: '0x059345dE4c56C80A5d90AD3B170627e2a7339173',
                value: '0x0',
                data: ''
            }

            var tx = new Tx(rawTx);
            tx.sign(privateKey);
            console.log('Your private key will be deleted once transaction finishes.')
            
            var serializedTx = tx.serialize();

            web3.eth.sendRawTransaction(serializedTx.toString('hex'), function (err, hash) {
                if (!err)
                    console.log(hash); 
                else
                    console.log('An error occured');
            });

        });

        //TODO: send tokens using Web 3 and use ranges
        /*for (var i = 0; i < _csvAddresses.length; i++) {

        }*/
    }

    run(argString) {

        //TODO: Add defaults
        //defaults that get overriden by command line entries

        let conf = {
            wall: '../resources/sampleWallet',
            csv: '../resources/default.csv',
            addr: '',
            deci: '',
            offs: '0',
            batc: '10',
            tready: 'false',
        };

        //Parse command line args
        let args = this.getArgs(argString && argString.split(' '));

        //Get config file (depends on command line arg --conf)
        let parsedConfig = this.getConfig(args.conf);

        //Config file overrides default options listed in this method
        _.assign(conf, parsedConfig);

        //Command line args override config file args - keys creates an array of the input
        _.keys(args).forEach(k => {
            //parseArgs sets missing values to null
            if (args[k] !== null) {
                conf[k] = args[k];
            }
        });

        conf.addr = this.getWalletAddr(conf.wall.toString());

        fs.writeFileSync('../resources/config.conf', ini.stringify(conf, {}))

        //TODO: read JSON container and login
        //ASSUMPTION: CSV file is formatted as such: address, tokens, address, tokens (no spaces)
        var csvTest = fs.createReadStream(conf.csv)
            .pipe(fastCSV())
            .on('data', function (data) {
                //Comma delimiter separates values in CSV.  Values are stored in an array.
                _csvData = data;
            })
            .on('end', function (data) {
                //Values are separated into their according array.  Assuming the file is formatted as address,token,address,token
                for (var i = 0; i < _csvData.length; i++) {
                    if (i % 2 === 0) {
                        _csvAddresses.push(_csvData[i]);
                        //this.nonce = _csvAddresses.length;
                    } else {
                        _csvAmounts.push(_csvData[i]);
                    }
                }
            });

        //sets the default account (sender account)
        web3.eth.defaultAccount = `0x${conf.addr}`;
        console.log(web3.eth.defaultAccount);

        //TODO: Check for no file error

        //if the user is ready, set a arg to true, then run transaction method
        if (conf.tready.toString().toLowerCase() === 'true') {
            this.nonce = conf.batc;
            console.log(this.nonce);
            this.enactTransaction();
            //get user password, sendTransaction(using gas prices, limit, nonce, addresses);
        }
    }
}

module.exports = TypeCommand;
