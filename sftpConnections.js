const sftp = require('ssh2-sftp-client');
const path = require('path');
const { config } = require('dotenv');

const uploadFileToSFTP = async (config, csvFile, remoteFilePath) => {
    const sftpClient = new sftp();
    try {
        await sftpClient.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password
        });
        console.log(`Connected to SFTP server at ${config.host}`);

        await sftpClient.put(csvFile, remoteFilePath);
        console.log(`File uploaded successfully to ${remoteFilePath}`);
    } catch (error) {
        console.error('Error uploading file to SFTP:', error);
        throw error;
    } finally {
        await sftpClient.end();
        console.log('SFTP connection closed');
    }
}

module.exports = {
    uploadFileToSFTP
};