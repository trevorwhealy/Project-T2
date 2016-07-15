var routes = require('express').Router();
var googleTrends = require('google-trends-api');
var Twitter = require('twitter');
var fs = require('fs');
var api_key = require('../api_keys.js')


// Watson functions below

var watson = require('watson-developer-cloud');
var Promise = require('bluebird');

var alchemy_language = watson.alchemy_language({
  api_key: api_key.watson_api_key
});
 
var tweets = [{text: 'i am happy'}, {text: 'i am sad'}]
 
var positiveCount = 0;
var negativecount = 0;
var neutralCount = 0;

var getSentiment = function(item) {
	return new Promise(function(resolve, reject) {
		alchemy_language.sentiment(item, function (err, response) {
		  if (err) {
		    reject(err);
		  } else {
		  	resolve(response.docSentiment.type);
		  }
		});
	})
};

var countSentiment = function(sentimentType) {
	if (sentimentType === 'neutral') {
	  neutralCount++;
	} else if (sentimentType === 'positive') {
		positiveCount++
	} else if (sentimentType === 'negative') {
		negativecount++
	}
}

var getAggregateSentiment = function(tweets) {
	tweets.forEach(function(tweet) {
		getSentiment(tweet).then(function(item) {
			countSentiment(item);
		}).then(function() {
			if (tweets.length === positiveCount + negativecount + neutralCount) {
				var total = positiveCount + negativecount + neutralCount;
				console.log('positive: ', positiveCount / total, ' negative: ', negativecount / total, ' neutral: ', neutralCount / total);
			}
		})
	})
}

// Twitter functions below

routes.get('/trends', function(req, res, next) {
	var trendArray = 
	googleTrends.hotTrends('US')
	.then(function(results){
		res.send(results);
	})
	.catch(function(err){
		console.log(err);
	});
});

routes.post('/grabTweets', function(req, res) {
	var query = req.body.q;
	var grabTweets = new Twitter({

	 consumer_key: api_key.consumer_key,
	 consumer_secret: api_key.consumer_secret,
	 access_token_key: api_key.access_token_key,
	 access_token_secret: api_key.access_token_secret

	});
	grabTweets.get('search/tweets', {q: query, count: 10, result_type: 'recent', lang: 'en'}, function(error, tweets, response) {
	 if (!error) {
	   var tweetText = tweets.statuses.map(function(tweetObj) {
	      return {text: tweetObj.text
	      .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')
	      .replace(/[`~@#$%^&*()_|☆+\-=;:<>\{\}\[\]\\\/]/gi, ' ')
	    	}
	   })
	   getAggregateSentiment(tweetText);


	   // fs.writeFile('tweets.txt', JSON.stringify(tweetText), function(err) {
	   //     if(!err) {
	   //     console.log('success: ');
	   //     }
	   // })
	 }
	});
});

module.exports = routes;
