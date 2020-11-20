const axios = require('axios');

const controller = {
    home: async (req, res) => {
        const cityName = "San Francisco";
        const date = new Date();
        let result;
        console.log("[home] start", cityName);

        result =  await axios.get('http://api.openweathermap.org/data/2.5/weather', {
            params: {
                q: cityName,
                appid: "f45a485aa6c3a81f506c61edb0597cca"
            }
        });
        console.log("[home] get weather status", result.status);
        const resData = {
            status: 'fail',
            city: cityName,
            temp: null,
            timestamp: null,
            time: '00:00'
        }
        
        if(result) {
            console.log("[home] get weather", result.data);

            resData.status = 'success';
            resData.temp = Math.round((result.data.main.temp - 273.15)*9/5 + 32);
            
            // calculate local time
            const timeOffset = result.data.timezone;
            let hour,min;
            hour = date.getUTCHours() + timeOffset/3600;
            if( hour<0) {
                hour += 24;
            }
            min = date.getMinutes();
            resData.time = `${hour}:${min}`;
            resData.timestamp = Math.round(date.getTime()/1000);

            // weather data
            if (result.data.main) {
                resData.humidity = result.data.main.humidity;
            }
            if (result.data.clouds) {
                resData.clouds = result.data.clouds.all;
            }
            if (result.data.rain) {
                resData.rain = result.data.rain["1h"];
            }
            if (result.data.wind) {
                resData.wind = result.data.wind.speed;
            }
            if (result.data.sys) {
                resData.sunrise = result.data.sys.sunrise;
                resData.sunset = result.data.sys.sunset;
            }
        } 
        // console.log("[home] resp", resData);

        res.render('index',resData);
    }
}

module.exports = controller;
