module.exports = {
    sessionConfig : {
        secret:'mysecret',  
        resave: false, 
        saveUninitialized: true, 
        cookie:{
            secure:false, 
            maxAge: 1000*60*60*24*30 
        }
    }
}