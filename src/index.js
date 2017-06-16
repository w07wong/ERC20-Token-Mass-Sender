var MassSender = require('./mass-sender.js');

var tc = new MassSender();

try {
    tc.run();
} catch(err) {
    console.error(err);
}
