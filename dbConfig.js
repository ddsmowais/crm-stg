const  dbConfig = {
    server: "sql.bsite.net\\MSSQL2016",
            database: "crmproject_SampleDB",
            user: "crmproject_SampleDB",
            password: "pass123",
            options: {
                trustedConnection: true, // Use Windows authentication
                trustServerCertificate:true,
                encrypt: true, // For encrypting the connection
                connectTimeout:50000,
  }
}
  
  module.exports = dbConfig;