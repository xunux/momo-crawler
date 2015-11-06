var request = require('request');
var async = require('async');
var HttpsProxyAgent = require('https-proxy-agent');

var proxy = 'http://112.93.114.50:80';
var agent = new HttpsProxyAgent(proxy);

var crawler = {
    config: {
        markCompleteEndPoint: 'http://localhost:1337/queue/',
        queueEndPoint: 'http://localhost:1337/getUserList',
        profileEndPoint: 'https://api.immomo.com/api/profile/',
        saveProfileEndpoint: 'http://localhost:1337/user',
        headers: {
            'User-Agent': 'MomoChat/6.3.3 ios/308 (iPhone 5S; iPhone OS 8.4; en_US; iPhone6,2; S1)',
            'm_status': 1,
            'X-LV': 1,
            'P-TOKEN': 'dd5ae33c34e2946f',
            'X-KV': 'f14dd39f',
            'Cookie': 'SESSIONID=DB5CD145-5496-2158-0395-DB7CBAC13959'
        },
        currentGroup: 1,
        userList: null,
        proxyList: null,
        currentProxyIp: null,
    },
    start: function () {
        var _this = this;
        //return this.getProxyIp();
        this.getUserList()
            .then(this.loadUserList.bind(this))
            .then(function (data) {
                console.log('抓取保存完毕');
                _this.start();
            })
            .catch(function (err) {
                console.log(err)
            });
    },
    getProxyIp: function () {
        var _this = this;
        console.log('正在获取代理ip');
        request({
            url: 'http://www.kuaidaili.com/api/getproxy/?orderid=984032047727971&num=20&protocol=1&method=1&an_ha=1&sp1=1&quality=0&sort=0&dedup=1&format=text&sep=3'
        }, function (error, response, body) {
            if (error) {
                return console.log(error);
            }
            if (/ERROR/.test(body)) {
                console.log('暂时无法获取ip，需等候5秒');
                return setTimeout(function () {
                    _this.getProxyIp();
                }, 5000);
            }
            var proxyList = body.split(' ');
            _this.config.proxyList = proxyList;
            console.log('成功获取代理ip', proxyList.length, '个');
            _this.checkProxyIp();
        });
    },
    checkProxyIp: function () {
        var _this = this;
        if (this.config.proxyList.length === 0) {
            console.log('代理ip没有了');
            return this.getProxyIp()
        }
        var testingIp = this.config.proxyList.pop();
        console.log('开始测试代理ip:', testingIp);
        var proxy = 'http://' + testingIp;
        var agent = new HttpsProxyAgent(proxy);
        request({
            agent: agent,
            method: 'GET',
            //            url: _this.config.profileEndPoint + '261295473 ',
            url: 'http://www.baidu.com',
            headers: _this.config.headers,
            timeout: 3000
        }, function (error, response, body) {
            if (error) {
                console.log('代理ip无响应');
                return _this.checkProxyIp();
            }
                //            var body = JSON.parse(body);
                //            if (body.errcode === 500) {
                //                return console.log('ip已经被陌陌封了！！！, 尝试更换ip');
                //            }
        });
    },
    getUserList: function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request({
                method: 'GET',
                url: _this.config.queueEndPoint
            }, function (error, response, body) {
                if (error) {
                    return reject(error);
                }
                var res = JSON.parse(body);
                _this.config.userList = res.queue;
                return resolve();
            });
        });

    },
    loadUserList: function () {
        var _this = this;
        console.log('获取到', this.config.userList.length, '个待抓取用户');
        //开始查询用户
        if (this.config.userList.length === 0) {
            console.log('当前批次用户已经抓取完毕');
            this.start();
        }
        return new Promise(function (resolve, reject) {
            async.mapLimit(_this.config.userList, 50, function (item, callback) {
                _this.saveUserInfo(item.user_id)
                    .then(function (data) {
                        callback(null, data);
                    }).catch(function (err) {
                        callback(err);
                    });
            }, function (error, data) {
                if (error) {
                    console.log('抓取用户出现问题');
                    return reject(error);
                }
                console.log('抓取完毕', data.length, '个');
                return resolve(data);
            });
        });
    },
    saveUserInfo: function (id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request({
                //agent: agent,
                method: 'POST',
                url: _this.config.profileEndPoint + id,
                headers: _this.config.headers
            }, function (error, response, body) {
                if (error) {
                    return reject(error);
                }
                var body = JSON.parse(body);
                if (body.errcode === 500) {
                    return reject('ip已经被陌陌封了！！！');
                }
                resolve(body);
            });
        }).then(function (data) {
            return _this.saveProfile(data);
        });
    },
    markComplete: function (id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request({
                method: 'PUT',
                url: _this.config.markCompleteEndPoint + id,
                form: {
                    isGet: true
                }
            }, function (error, response, body) {
                if (error) {
                    return reject(error);
                }
                resolve(body);
            });
        });
    },
    saveProfile: function (data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request({
                method: 'POST',
                url: _this.config.saveProfileEndpoint,
                headers: _this.config.headers,
                form: {
                    user_id: data.momoid,
                    name: data.name,
                    sex: data.sex,
                    age: data.age,
                    constellation: data.constellation,
                    sign: data.sign,
                    vip_level: data.vip_level || 0,
                    feed_count: data.feed_count || 0,
                    regtime: data.regtime,
                    interest: data.interest || '',
                    photos: data.photos || '',
                    job: data.job || '',
                    website: data.website || '',
                    company: data.company || '',
                    school: data.school || '',
                    aboutme: data.aboutme || '',
                    hangout: data.hangout || '',
                    languages: data.languages || '',
                    hometown: data.hometown || '',
                    livein: data.livein || '',
                    industry: data.industry || '',
                    sina_user_id: data.sina_user_id || 0,
                    tencent_user_id: data.tencent_user_id || 0,
                    official: data.official || '',
                    sp_job: data.sp_job || ''
                }
            }, function (error, response, body) {
                if (error) {
                    console.log(error);
                    return reject(error);
                }
                resolve(JSON.parse(body));
            });
        }).then(function (res) {
            if (res.name) {
                console.log('成功保存:', res.name, '#', res.id);
                return res.id;
            }
            console.log('保存失败: ', data.name, data.momoid);
            return res.id;
        }).then(function (id) {
            return _this.markComplete(id);
        });
    }
}

crawler.start();