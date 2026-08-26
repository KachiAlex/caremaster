const bcrypt = require('bcryptjs');
bcrypt.hash('***REMOVED***', 12).then(h => {
  console.log(h);
});
