var ArgumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var ini = require('ini');
var _ = require('lodash');
var pjson = require('../package.json');
var fastCSV = require('fast-csv');
//TODO: implment Web3

const TEST_VERSION = pjson.version;

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
            help: 'Specify configuration file (default: /lib/test.conf)',
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
            metavar: 'path',
          }
        );

        //batch size
        parser.addArgument(
          ['--batc'], {
            help: 'Specify batch size (how many transactions to send, default: to the end of CSV file)',
            metavar: 'path',
          }
        );

        //TODO: add password argument

        return parser.parseArgs(args);
    }

    getConfig(configFile) {
        let iniData;
        try {
            //TODO: Add conf.ini file
            initialData = fs.readFileSync(configFile || '/lib/test.conf', 'utf-8');
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
        let config = {
            wall: '',
            csv: '',
            addr: '',
            deci: '',
            offs: '',
            batc: '',
        };

        //Parse command line args
        let args = this.getArgs(argString && argString.split(' '));

        //Get config file (depends on command line arg -conf)
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

        //TODO: read JSON container and store vars
        //TODO: read CSV and store vars & verify if csv file is readable
        var csvTest = fs.createReadStream(config.csv)
            .pipe(fastCSV())
            .on('data', function(data) {
                //do something with the data
                //store in vars
            })
            //TODO: send error message if file is not readable
            .on('end', function(data) {
                //do something
                //set default variables for any empty things?  maybe amounts are empty so just fill with 0
            });

       /*csvTest.on('error', function(err) {
            console.log("Couldn't read CSV file");
        });*/

        //TODO: send tokens using Web 3 and use ranges
    }
}

module.exports = TypeCommand;
