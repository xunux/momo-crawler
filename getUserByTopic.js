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
		url: 'https://api.immomo.com/v1/topic/items/all',
  		count: 50,
  		index: 0,
  		topic_id: null,
  		id: null,
  		currentGroup: 1,
  		topic_name: null,
	},
	start: function(){
		var _this = this;
		this.loadUncompleteTopic().then(function(data){
			var res = JSON.parse(data);
			_this.config.id = res.topic.id;
			_this.config.topic_id = res.topic.topic_id;
			_this.config.topic_name = res.topic.topic_name;
			_this.config.currentGroup = 1;
			_this.loadUser();
		}).catch(function(err){
			console.log(err);
			console.error('遇到错误，停止抓取');
		});
	},
	loadUncompleteTopic: function(){
		return new Promise(function(resolve,  reject){
			request({
				method: 'GET',
				url: 'http://localhost:1337/getTopic'
			}, function(error, response, body){
				if(error){
					return reject(error);
				}
				resolve(body);
			});
		});
	},
	loadUser: function(){
		console.log('当前抓取的话题是', this.config.topic_name);
		console.log('--------------------当前正在进行第', this.config.currentGroup,'轮查询---------------------');
		var _this = this;
		request({
			method: this.config.method,
			url: this.config.url,
			headers: this.config.headers,
		  	form: {
		  		'count': this.config.count,
		  		'index': this.config.index,
		  		'topic_id': this.config.topic_id
		  	}
		}, function(error, response, body){
			if (error) {
		      return console.error('error:', error);
		    }
		    var res = JSON.parse(body);
		    _this.makeRequest(res.data.lists);
		});
	},
	makeRequest: function(lists){
		var _this = this;
		console.log('获取到话题说说数量：', lists.length);
		async.eachLimit(lists, 50, function(item, callback){
			request({
				method: 'POST',
				url: 'http://localhost:1337/queue',
			  	form: {
		  		'user_id': item.source.owner
			  	}
			}, function(error, response, body){
				if (error) {
			      	return console.error('error:', error);
			    }
			    callback(null);
			    var res = JSON.parse(body);
			    if (res.status === 400){
			    	return console.log('已存在用户: ', item.source.owner);
			    }
			    console.log('当前成功写入', item.source.owner);		  	
			});
		}, function(){
			console.log('---------------------第', _this.config.currentGroup, '轮结束--------------------');
			if(lists.length === 0) {
				console.log('话题id：', _this.config.topic_id, '已查询结束');
				return _this.setTopicComplete().then(function(){
					console.log('成功标记话题:', _this.config.topic_id, '为已完成');
					_this.start();
				});
			}
			_this.nextGroupTopic();
		});
	},
	nextGroupTopic: function(){
		this.config.currentGroup += 1;
		this.config.index += 50;
		this.loadUser();
	},
	setTopicComplete: function(){
		var _this = this;
		return new Promise(function(resolve, reject){
			request({
			method: 'PUT',
			url: 'http://localhost:1337/topic/' + _this.config.id,
			form: {
				isCompleted: true
			} 
			}, function(error, response, body){
				if (error) {
			      	console.log('error:', error);
			      	return reject(error);
			    }
			    var res = JSON.parse(body);
				return resolve(res);
			});
		});
	}
};

crawler.start();

