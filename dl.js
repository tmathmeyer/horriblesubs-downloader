var request = require('request');
var Transmission = require('transmission');
var fs = require('fs');
var cheerio = require('cheerio');
var read = require('read');

super_read = function(data, callback, bundle) {
    if (!bundle) bundle = [];
    if (Object.keys(data).length == 0) callback.apply(null, bundle);
    else {
        var _prompt = Object.keys(data)[0];
        data[_prompt].prompt = _prompt;
        read(data[_prompt], function(err, result) {
            bundle.push(result);
            delete data[_prompt];
            super_read(data, callback, bundle);
        });
    }
};

super_read({
    "Anime Name (horriblesubs.info/shows/XXX): ": {},
    "Last Episode Downloaded (0 for none, defaults to 0): ": {},
    "Transmission URL/Hostname (default localhost): ": {},
    "Transmission Port (80 default): ": {},
    "Transmission Webclient Username: ": {},
    "Transmission Webclient Password: ": {
        'silent': true
    },
    "Transmission Download Path (Defaults to transmission default): ": {}
}, function(showname, last_downloaded, host, port, user, pass, transpath) {
    if (!port) port = 80;
    if (!last_downloaded) last_downloaded = 0;
    if (!host) host = 'localhost';
    var transmission = new Transmission({
        'port': Number(port),
        'host': host,
        'username': user,
        'password': pass
    });
    var url = "http://horriblesubs.info/shows/"+showname;
    request(url, function(e, r, b) {
        if (!e && r.statusCode == 200) {
            c = b.split("hs_showid");
            c = c[1].split(';')[0].split('=')[1].trim();
            getMagnets(c, 0, transmission, showname, last_downloaded, transpath);
        } else {
            console.log("invalid show name");
        }
    });
});

geturl = function(id, tok) {
    var lksurl = "http://horriblesubs.info/lib/getshows.php?type=show"
        lksurl += ("&showid=" + id);
    lksurl += ("&nextid=" + tok);
    return lksurl;
}

getMagnets = function(url, id, transmission, showname, last_downloaded, transpath) {
    request(geturl(url, id), function(e, r, b) {
        if (!e && r.statusCode == 200) {
            parse(cheerio.load(b), transmission, showname, last_downloaded, url, id+1, transpath);
        } else {
            console.log('cannot get magnets');
        }
    });
}

parse = function($, transmission, showname, last_downloaded, url, needmoreid, transpath) {
    huh = $('.release-info');
    var size = huh.length;
    var trig = true;
    huh.each(function(name, each) {
        size--;
        bestQuality = $(this).nextUntil('.release-info').last();
        href = bestQuality.find('a').attr('href');
        name = bestQuality.attr('class').split(' ')[1];
        qname = name.split(showname)[1];
        while(qname.charAt(0) == '-') qname = qname.substr(1);
        epnum = qname.split('-')[0];
        opts = {};
        if (transpath) opts['download-dir'] = transpath;
        if (Number(epnum) > last_downloaded) {
            transmission.addUrl(href, opts, function(err, arg) {
                if (err) console.log(err);
                else {
                    console.log("downloading episode: " + name);
                }
            });
            if (size == 0 && trig) {
                trig = false;
                getMagnets(url, needmoreid, transmission, showname, last_downloaded, transpath);
            }
        } else if (!Number(epnum)) {
            console.log('not downloading: ' + epnum);
        }
    });
}
