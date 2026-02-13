## FTP Pricelists Integration

Node.js workflow to fetch supplier FTP CSVs, normalize data, and load a staging table in MSSQL.

### Features
- Fetch CSVs from FTP servers (AutoPartner, InterParts)
- Normalize data into a shared schema
- Write raw files to ./raw for backup
- Bulk insert into MSSQL staging table

### Project Structure
- index.js: main workflow
- ftpConnection.js: FTP client helpers
- fileProcess.js: local file read/write helpers
- dbProcess.js: MSSQL connection and staging writes
- models/normalized.js: normalized data model
- raw/: raw CSV backups
- processed/: optional processed outputs

### Requirements
- Node.js 18+
- Access to FTP servers
- Access to MSSQL database

### Setup
1. Install dependencies:
	- npm install
2. Create a .env file in the project root:

	FTP_HOST_AUTOPARTNER=ftp.autopartner.dev
	FTP_USER_AUTOPARTNER=YOUR_USER
	FTP_PASSWORD_AUTOPARTNER=YOUR_PASSWORD
	FTP_FILENAME_AUTOPARTNER_PRICELIST=3112420.csv
	FTP_FILENAME_AUTOPARTNER_STOCK=STANY.csv

	FTP_HOST_INTERPARTS=ftp3.interparts.pl
	FTP_USER_INTERPARTS=YOUR_USER
	FTP_PASSWORD_INTERPARTS=YOUR_PASSWORD
	FTP_FILENAME_INTERPARTS=58674_ce.csv

	ORUM_DATABASE_URL=YOUR_SQL_HOST
	ORUM_DATABASE_NAME=YOUR_DB
	ORUM_DATABASE_USERNAME=YOUR_DB_USER
	ORUM_DATABASE_PASSWORD=YOUR_DB_PASSWORD

### Run
- npm start

### Workflow
1. Download FTP files
2. Save to ./raw
3. Normalize data to a shared model
4. Truncate staging table
5. Bulk insert into staging

### Troubleshooting
- ENOTFOUND: check FTP host in .env
- 550 RETR failed: verify filename or FTP directory
- Bulk insert error 4816: ensure MSSQL column types match table schema

### Notes
- Normalization is currently implemented for InterParts & AutoPartner
