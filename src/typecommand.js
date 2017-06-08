var ArgumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var ini = require('ini');
var _ = require('lodash');
var pjson = require('../package.json');
var fastCSV = require('fast-csv');
var Web3 = require('web3');
var web3 = new Web3();
//TODO: implment Web3

const TEST_VERSION = pjson.version;

let _csvData = [];
let _csvAddresses = [];
let _csvAmounts = [];
let _csvIndex = 0;

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
            help: 'Specify CSV file with Ethereum addresses and amounts',
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

        //TODO: add password argument

        return parser.parseArgs(args);
    }

    getConfig(configFile) {
        let iniData;
        try {
            iniData = fs.readFileSync(configFile || '../resources/config.conf', 'utf-8');
        } catch (err) {
            //Only throw on failure to read if configuration file was expilicitly specified
            if(configFile) {
                throw new Error("couldn't read config file " + configFile);
            }
        }
        return iniData ? ini.parse(iniData) : {};
    }


    run(argString) {

        //TODO: Add defaults
        //defaults that get overriden by command line entries

        //let defaultBatchSize = config.csv.length/2

        let config = {
            wall: '../resources/UTC--2017-06-08T23-08-53.501Z--fb9119d94ec08285ba7c06bcdb370b3f81bf82f9',
            csv: '../resources/default.csv',
            addr: '0xfB9119D94eC08285bA7C06bCDb370B3f81bF82F9', // EXMPL',
            deci: '',
            offs: '0',
            batc: '0',
        };

        //Parse command line args
        let args = this.getArgs(argString && argString.split(' '));

        //Get config file (depends on command line arg --conf)
        let parsedConfig = this.getConfig(args.conf);

        //Config file overrides default options listed in this method
        _.assign(config, parsedConfig);

        //Command line args override config file args - keys creates an array of the input
        _.keys(args).forEach(k => {
            //parseArgs sets missing values to null
            if(args[k] !== null) {
                config[k] = args[k];
            }
        });

        fs.writeFileSync('../resources/config.conf', ini.stringify(config, {}))

        //TODO: read JSON container and store vars
        //ASSUMPTION: CSV file is formatted as such: address, tokens, address, tokens (no spaces)
        var csvTest = fs.createReadStream(config.csv)
            .pipe(fastCSV())
            .on('data', function(data) {
                //Comma delimiter separates values in CSV.  Values are stored in an array.
                _csvData = data;
            })
            .on('end', function(data) {
                //Values are separated into their according array.  Assuming the file is formatted as address,token,address,token
                for(var i = 0; i < _csvData.length; i++) {
                    if(i%2 === 0) {
                        _csvAddresses.push(_csvData[i]);
                    } else {
                        _csvAmounts.push(_csvData[i]);
                    }
                }
            });

        //TODO: send tokens using Web 3 and use ranges
    }
}

module.exports = TypeCommand;
