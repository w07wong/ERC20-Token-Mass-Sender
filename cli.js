#!/usr/bin/env node

var fs = require('fs');
var program = require('commander');
var ArgumentParser = require('argparse').ArgumentParser;

class CLI {
    constructor() {

    }

    getArgs(args) {
        var parser = new ArgumentParser({
          version: '1.0.0',
          addHelp:true,
          description: 'Cli parser'
        });

        parser.addArgument(
          [ '--wallet' ],
          {
            help: 'ether wallet'
          }
        );
        parser.addArgument(
          [ '--csv' ],
          {
            help: 'csv address'
          }
        );
        parser.addArgument(
          [ '--address' ],
          {
            help: 'contract address'
          }
        );parser.addArgument(
          [ '--decimals' ],
          {
            help: 'token decimals'
          }
        );parser.addArgument(
          [ '--batch' ],
          {
            help: 'batch size'
          }
        );parser.addArgument(
          [ '--offset' ],
          {
            help: 'csv offset'
          }
        );

        return parser.parseArgs(args);
    }

    getWallet(wallet) {
        let iniData;
        try {
            iniData = fs.readFileSync(wallet || 'default', 'utf-8');
        } catch (err) {
            //Only throw on failure to read if wallet file was explicitly specified
            throw new Error("couldn't read wallet file " + wallet);
        }
    }

    getCSV(csv) {
        let iniData;
        try {
            iniData = fs.readFileSync(csv || 'default', 'utf-8');
        } catch (err) {
            //Only throw on failure to read if wallet file was explicitly specified
            throw new Error("couldn't read csv file " + csv);
        }
    }

    run(testArgString) {
    // Defaults (get overridden by conf file, or command line args)
        let config = {
          wallet: json_container,
          csv: csv_file,
          address: contract_address,
          decimals: token_decimals,
          batch: batch_size,
          offset: csv_offset,
        };
    }
    // Parse command line args
    //let args = this.getArgs(testArgString && testArgString.split(' '));
}

export default CLI;

 /*program
  .arguments('<file>')
  .option('-u, --username <username>', 'The user to authenticate as')
  .option('-p, --password <password>', 'The user\'s password')
  .action(function(asdf) {
    console.log('user: %s pass: %s file: %s',
        program.username, program.password, asdf);
  })
  .parse(process.argv);
program
    //.arguments('<file>')
    .option('-w, --wallet <etherWallet>', 'The file to decrypt')
    .option('-c, --csv <csvAddress>', 'File with ethereum addresses and amounts')
    .option('-a, --address <contractAddress>', 'ERC20 Contract Address')
    .option('-d, --decimals <tokenDecimals>', 'ERC20 Token Decimals')
    .option('-o, --offset <csvOffset>', 'Offset in CSV file')
    .option('-b, --batch <batchSize>', 'How many transactions to send')
    /*.action(function(file) {
        co(function *() {
            var wallet = yield prompt('Ether Wallet: ');
            var csv = yield prompt('CSV Address: ');
            var address = yield prompt('Contract Address: ');
            var decimals = yield prompt('Token Decimals: ');
            var offset = yield prompt('CSV Offset: ');
            var batch = yield prompt('Batch Size');
            console.log('w: %s csv: %s address: %s decimals: %s offset: %s batch: %s', wallet, csv, address, decimals, offset, batch);
        });
    })*/
    //.parse(process.argv);





