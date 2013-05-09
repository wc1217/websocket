var mysql = require('mysql'),
connection = mysql.createConnection('mysql://root:wc@localhost/chat');

connection.query('SELECT * FROM ?? WHERE id = ?', ['users', userId], function(err, results){
    // ...
    });