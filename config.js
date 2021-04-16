module.exports = {
    BASE_URL: "http://localhost/",
    FCM_SERVER_KEY : "AAAA0DAm3nM:APA91bGQaePMKOsvT-ClU7bv1a1xVqUlzFsc7gQm1kTVkpajocntBhu-8JioVd0K-_UjcpoFct0EdHYstgNJlJYpxSnxJ5WG8JdrP5MSdcBMvwD0bSa1Zbe_9EtMqABP5S0bt94B7v7L",
    MAPS_API_KEY : 'AIzaSyA3kg7YWugGl1lTXmAmaBGPNhDW9pEh5bo',
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