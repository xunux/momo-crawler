var request = require('request');
var async = require('async');

var crawler = {
	config: {
		method: 'POST',
		headers: {
		    	'User-Agent': 'MomoChat/6.3.3 ios/308 (iPhone 5S; iPhone OS 8.4; en_US; iPhone6,2; S1)',
		    	'm_status': 1,
		    	'X-LV': 1,
		    	'P-TOKEN': 'dd5ae33c34e2946f',
		    	'X-KV': 'f14dd39f',
		    	'Cookie': 'SESSIONID=DB5CD145-5496-2158-0395-DB7CBAC13959'
		 },
		url: 'https://api.immomo.com/v1/topic/index/my',
  		count: 20,
  		index: 0,
  		currentGroup: 1
	},
	start: function(){
		this.loadTopic();
	},
	loadTopic: function(){
		console.log('--------------------当前正在进行第', this.config.currentGroup,'轮查询---------------------');
		var _this = this;
		request({
			method: this.config.method,
			url: this.config.url,
			headers: this.config.headers,
		  	form: {
		  		'count': this.config.count,
		  		'index': this.config.index,
		  	}
		}, function(error, response, body){
			if (error) {
		      return console.error('error:', error);
		    }
		    var res = JSON.parse(body);
		    var topisList = res.data.recommend.concat(res.data.my);
		    _this.makeRequest(topisList);
		});
	},
	makeRequest: function(lists){
		var _this = this;
		console.log('获取到话题数量：', lists.length);
		async.eachLimit(lists, 50, function(item, callback){
			request({
				method: 'POST',
				url: 'http://localhost:1337/topic',
			  	form: {
			  		'topic_id': item.topic_id,
			  		'topic_name': item.topic_name,
			  		'member_count': item.member_count,
			  		'feed_count': item.feed_count
			  	}
			}, function(error, response, body){
				if (error) {
			      	return console.error('error:', error);
			    }
			    callback(null);
			    var res = JSON.parse(body);
			    if (res.status === 400){
			    	return console.error('已存在话题: ', item.topic_name);
			    }
			    console.log('当前成功写入', item.topic_name);		  	
			});
		}, function(){
			console.log('---------------------第', _this.config.currentGroup, '轮结束--------------------');
			_this.nextGroupTopic();
		});
	},
	nextGroupTopic: function(){
		this.config.currentGroup += 1;
		this.config.index += 20;
		this.loadTopic();
	}
};

crawler.start();
