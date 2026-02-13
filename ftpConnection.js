const fs = require('fs');
const ftp = require('ftp');

const getData = (host, user, password, wantedFile) => {
    return new Promise((resolve, reject) => {
        const ftpConfig = {
            host: host,
            user: user,
            password: password
        };

        const csvFileName = wantedFile;
        const client = new ftp();

        client.connect(ftpConfig);

        client.on('ready', () => {
            console.log(`Connected to FTP server - retrieving ${csvFileName}`);

            client.get(csvFileName, (err, stream) => {
                if (err) {
                    console.error(`Error retrieving file "${csvFileName}":`, err.message);
                    client.end();
                    reject(err);
                    return;
                }
                
                let csvData = '';
                stream.on('data', chunk => {
                    csvData += chunk;
                });

                stream.on('end', () => {
                    console.log(`CSV file "${csvFileName}" downloaded successfully`);
                    client.end();
                    resolve(csvData);
                });

                stream.on('error', (streamErr) => {
                    console.error('Stream error:', streamErr.message);
                    client.end();
                    reject(streamErr);
                });
            });
        });

        client.on('end', () => {
            console.log('Disconnected from FTP server');
        });
        
        client.on('error', err => {
            console.error('FTP error:', err.message);
            reject(err);
        });
    });
}

const listFiles = (host, user, password) => {
    return new Promise((resolve, reject) => {
        const ftpConfig = {
            host: host,
            user: user,
            password: password
        };
        
        const client = new ftp();
        client.connect(ftpConfig);

        client.on('ready', () => {
            console.log(`Connected to ${host}`);
            
            client.list((err, list) => {
                if (err) {
                    console.error('Error listing files:', err.message);
                    client.end();
                    reject(err);
                    return;
                }
                
                console.log('Available files:');
                list.forEach(file => {
                    console.log(`  - ${file.name}`);
                });
                
                client.end();
                resolve(list);
            });
        });

        client.on('error', err => {
            console.error('FTP error:', err.message);
            reject(err);
        });
    });
}

module.exports = {
    getData,
    listFiles
}