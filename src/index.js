var TypeCommand = require('./typecommand.js');

var tc = new TypeCommand();

try {
    tc.run();
} catch(err) {
    console.error(err);
}
