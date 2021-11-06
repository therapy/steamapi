# steamapi

## dependencies
```
npm i
```

## example
put steamUser.js in the same directory as your project
```js
const steamUser = require('./steamUser');

let username = "";
let password = "";

(async () => {
    const user = new steamUser();
    await user.login(username, password);
})();
```

`logged into ******** successfully`
