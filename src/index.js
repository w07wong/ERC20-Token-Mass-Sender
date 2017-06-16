var MassSender = require('./mass-sender.js');

var ms = new MassSender();

try {
    ms.run();
} catch(err) {
    console.error(err);
}
