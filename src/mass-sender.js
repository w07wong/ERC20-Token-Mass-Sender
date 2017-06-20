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
web3.setProvider(new web3.providers.HttpProvider(configFile.gethNode));

//contract setup
let contract = web3.eth.contract(configFile.abi).at(configFile.address);
let data;

//version
const ERC20_MASS_SENDER = pjson.version;

//vars for csv
let _csvAddresses = [];
let _csvAmounts = [];

//vars for transaction
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
                help: 'Specify an Ethereum wallet file.',
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
          ['--contractAddress'], {
                help: 'Specify a sending ERC20 contract address',
                metavar: 'address',
            }
        );

        //token decimals
        parser.addArgument(
          ['--tokenDecimal'], {
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
                help: 'Specify gas price (gwei)',
                metavar: 'num',
            }
        );

        //gas limit
        parser.addArgument(
          ['--gasLimit'], {
                help: 'Specify gas limit (gwei)',
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

    checkRequiredParams(walletVar, cavVar, contractAddressVar, gasPriceVar, gasLimitVar) {
        let paramArr = [walletVar, cavVar, contractAddressVar, gasPriceVar, gasLimitVar];
        for (var p in paramArr) {
            if (paramArr[p] == null || paramArr[p] === '' || paramArr[p] == undefined) {
                console.log('Missing a ' + paramArr[p]);
                return false;
            }
        }
        return true;
    }

    enactTransaction(addresses, amounts) {

        console.log('Running transaction...');

        prompt.start();
        prompt.get({
            properties: {
                privateKey: {
                    description: "Enter your wallet's private key",
                    hidden: true,
                    conform: function (value) {
                        return true;
                    }
                }
            }
        }, function (err, result) {
            //save inputs
            console.log('result: ', result);
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

                    //data
                    data = contract.transfer.getData(addresses[i]);

                    //transaction object
                    var rawTx = {
                        nonce: nonceHex,
                        gasPrice: gasPrice,
                        gasLimit: gasLimit,
                        to: contract.address,
                        from: web3.eth.defaultAccount,
                        value: valueAmountHex,
                        data: data
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
                    console.log('Transactions sent.');
                    i == addresses.length;
                }
            }

            //delete private key
            privateKey = '';

            //falsify ready in config
            configFile.ready = false;

        });
    }
    
    /*
    //RETURN WALLET
    
    //STEP 1
    
		$scope.wallet = null;
		$scope.addWalletStats = "";
		try {
			if ($scope.walletType == "pasteprivkey" && $scope.requirePPass) {
				$scope.wallet = Wallet.fromMyEtherWalletKey($scope.manualprivkey, $scope.privPassword);
				$scope.addAccount.password = $scope.privPassword;
			} else if ($scope.walletType == "pasteprivkey" && !$scope.requirePPass) {
				$scope.wallet = new Wallet($scope.manualprivkey);
				$scope.addAccount.password = '';
			} else if ($scope.walletType == "fileupload") {
				$scope.wallet = Wallet.getWalletFromPrivKeyFile($scope.fileContent, $scope.filePassword);
				$scope.addAccount.password = $scope.filePassword;
			} else if ($scope.walletType == "pastemnemonic") {
				$scope.mnemonicModel.open();
				$scope.HDWallet.hdk = hd.HDKey.fromMasterSeed(hd.bip39.mnemonicToSeed($scope.manualmnemonic.trim()));
				$scope.HDWallet.numWallets = 0;
				$scope.setHDAddresses($scope.HDWallet.numWallets, $scope.HDWallet.walletsPerDialog);
			}
		} catch (e) {
			$scope.notifier.danger(globalFuncs.errorMsgs[6] + e);
		}
		if ($scope.wallet != null) {
			$scope.addAccount.address = $scope.wallet.getAddressString();
			$scope.notifier.info(globalFuncs.successMsgs[1]);
			$scope.showAddWallet = true;
			$scope.showPassTxt = $scope.addAccount.password == '';
			$scope.setBalance();
		}
	};

    //STEP 2
    Wallet.getWalletFromPrivKeyFile = function(strjson, password) {
    var jsonArr = JSON.parse(strjson);
    if (jsonArr.encseed != null) return Wallet.fromEthSale(strjson, password);
    else if (jsonArr.Crypto != null || jsonArr.crypto != null) return Wallet.fromV3(strjson, password, true);
    else if (jsonArr.hash != null) return Wallet.fromMyEtherWallet(strjson, password);
    else if (jsonArr.publisher == "MyEtherWallet") return Wallet.fromMyEtherWalletV2(strjson);
    else
        throw globalFuncs.errorMsgs[2];
    };

    //STEP 3
    Wallet.fromV3 = function(input, password, nonStrict) {
    var json = (typeof input === 'object') ? input : JSON.parse(nonStrict ? input.toLowerCase() : input)
    if (json.version !== 3) {
        throw new Error('Not a V3 wallet')
    }
    var derivedKey
    var kdfparams
    if (json.crypto.kdf === 'scrypt') {
        kdfparams = json.crypto.kdfparams
        derivedKey = ethUtil.scrypt(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen)
    } else if (json.crypto.kdf === 'pbkdf2') {
        kdfparams = json.crypto.kdfparams
        if (kdfparams.prf !== 'hmac-sha256') {
            throw new Error('Unsupported parameters to PBKDF2')
        }
        derivedKey = ethUtil.crypto.pbkdf2Sync(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256')
    } else {
        throw new Error('Unsupported key derivation scheme')
    }
    var ciphertext = new Buffer(json.crypto.ciphertext, 'hex')
    var mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]))
    if (mac.toString('hex') !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase')
    }
    var decipher = ethUtil.crypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))
    var seed = Wallet.decipherBuffer(decipher, ciphertext, 'hex')
    while (seed.length < 32) {
        var nullBuff = new Buffer([0x00]);
        seed = Buffer.concat([nullBuff, seed]);
    }
    return new Wallet(seed)
}
*/

    run(argString) {

        //defaults that get overriden by command line entries
        let defaults = {
            wallet: '',
            csv: '',
            contractAddress: '',
            tokenDecimal: '',
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

        //sets the default account (sender account)
        web3.eth.defaultAccount = `0x${this.getWalletAddr(defaults.wallet.toString())}`;

        //sets the offset
        offset = defaults.offset;

        //sets the batch size
        batchSize = defaults.batch;

        //sets the gas price
        gasPrice = web3.toHex(defaults.gasPrice);

        //sets the gas limit
        gasLimit = web3.toHex(defaults.gasLimit);

        //sets the token decimal & multiplier to send fractional amounts
        tokenDecimal = defaults.tokenDecimal;
        tokenMultiplier = Math.pow(10, tokenDecimal * (-1));

        //if the user is ready, run transaction method
        if (this.checkRequiredParams(defaults.wallet, defaults.csv, defaults.contractAddress, defaults.gasLimit, defaults.gasPrice)) {

            let that = this;

            //Reads CSV, stores variables
            fastCSV
                .fromPath(defaults.csv, {
                    ignoreEmpty: true
                })
                .on('data', function (data) {
                    _csvAddresses.push(data[0]);
                    _csvAmounts.push(data[1]);
                })
                .on('end', function (data) {
                    prompt.start();
                    prompt.get({
                        properties: {
                            proceed: {
                                description: "Would you like to proceed with the transaction? (y/n)"
                            }
                        }
                    }, function (err, result) {
                        if (result.proceed.toLowerCase() === 'y')
                            that.enactTransaction(_csvAddresses, _csvAmounts);
                        else
                            console.log('You have chosen to not proceed with the transaction.');
                    });
                });
        }
    }
}


module.exports = MassSender;
