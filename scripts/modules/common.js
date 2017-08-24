'use strict';

// Todo: fix all _gd_ references...

function extendDefaults(source, properties) {
    let property;
    for (property in properties) {
        if (properties.hasOwnProperty(property)) {
            source[property] = properties[property];
        }
    }
    return source;
}

function serialize(obj) {
    var parts = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
    }
    return parts.join("&");
}

function fetchData(queryString, _data, onDataReceived) {
    const fetchTimer = Math.round((new Date()).getTime() / 1000);

    // Attempt to creat the XHR2 object
    var xhr;
    try {
        xhr = new XMLHttpRequest();
    } catch (e) {
        try {
            xhr = new XDomainRequest();
        } catch (e) {
            try {
                xhr = new ActiveXObject('Msxml2.XMLHTTP');
            } catch (e) {
                try {
                    xhr = new ActiveXObject('Microsoft.XMLHTTP');
                } catch (e) {
                    _gd_.utils.log('\nYour browser is not compatible with XHR2');
                }
            }
        }
    }

    xhr.open('POST', _gd_.static.getServerName(), true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function(e) {
        // Response handlers.
        if (xhr.readyState == 4 && xhr.status == 200) {
            var text = xhr.responseText;
            onDataReceived(text);
            _gd_.utils.log("fetchData success: " + text);
        }
        else {
            _gd_.utils.log("Xml fetch failed. Using default values!");
            onDataReceived();
        }
    };
    xhr.onerror = function(data) {
        _gd_.utils.log("fetchData error: " + data);
    };

    xhr.send(this.serialize(_data));
}

function log(msg) {
    if (_gd_.static.enableDebug) {
        console.log(msg);
    }
}

function getCookie(key) {
    var name = key + "_" + _gd_.static.gameId + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
    }
    return 1;
}

function setCookie(key, value) {
    var d = new Date();
    var exdays = 30;
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = key + "_" + _gd_.static.gameId + "=" + value + "; " + expires;
}

function sessionId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 32; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return (text);
}

function getXMLData(url) {
    const request = new Request(url, {
        method: 'GET'
    });
    return fetch(request)
        .then(response => response.text())
        .then(str => {
            let dom = parseXML(str);
            let obj = XML2Object(dom);
            return obj;
        })
        .catch((error) => error);
}

function parseXML(xml) {
    let dom = null;
    if (window.DOMParser) {
        try {
            dom = (new DOMParser()).parseFromString(xml, 'text/xml');
        }
        catch (e) {
            dom = null;
        }
    } else if (window.ActiveXObject) {
        try {
            dom = new ActiveXObject('Microsoft.XMLDOM');
            dom.async = false;
            if (!dom.loadXML(xml)) // parse error ..
                window.alert(dom.parseError.reason + dom.parseError.srcText);
        }
        catch (e) {
            dom = null;
        }
    } else {
        console.log('cannot parse xml string!');
    }
    return dom;
}

function XML2Object(xml, tab) {
    var X = {
        toObj: function(xml) {
            var o = {};
            if (xml.nodeType == 1) {
                if (xml.attributes.length)
                    for (var i = 0; i < xml.attributes.length; i++)
                        o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
                if (xml.firstChild) { // element has child nodes ..
                    var textChild = 0, cdataChild = 0, hasElementChild = false;
                    for (var n = xml.firstChild; n; n = n.nextSibling) {
                        if (n.nodeType == 1) hasElementChild = true;
                        else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++;
                        else if (n.nodeType == 4) cdataChild++; // cdata section node
                    }
                    if (hasElementChild) {
                        if (textChild < 2 && cdataChild < 2) {
                            X.removeWhite(xml);
                            for (var n = xml.firstChild; n; n = n.nextSibling) {
                                if (n.nodeType == 3)  // text node
                                    o["#text"] = X.escape(n.nodeValue);
                                else if (n.nodeType == 4)  // cdata node
                                    o["#cdata"] = X.escape(n.nodeValue);
                                else if (o[n.nodeName]) {  // multiple occurence of element ..
                                    if (o[n.nodeName] instanceof Array)
                                        o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                                    else
                                        o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                                }
                                else  // first occurence of element..
                                    o[n.nodeName] = X.toObj(n);
                            }
                        }
                        else { // mixed content
                            if (!xml.attributes.length)
                                o = X.escape(X.innerXml(xml));
                            else
                                o["#text"] = X.escape(X.innerXml(xml));
                        }
                    }
                    else if (textChild) { // pure text
                        if (!xml.attributes.length)
                            o = X.escape(X.innerXml(xml));
                        else
                            o["#text"] = X.escape(X.innerXml(xml));
                    }
                    else if (cdataChild) { // cdata
                        if (cdataChild > 1)
                            o = X.escape(X.innerXml(xml));
                        else
                            for (var n = xml.firstChild; n; n = n.nextSibling)
                                o["#cdata"] = X.escape(n.nodeValue);
                    }
                }
                if (!xml.attributes.length && !xml.firstChild) o = null;
            }
            else if (xml.nodeType == 9) { // document.node
                o = X.toObj(xml.documentElement);
            }
            else
                alert("unhandled node type: " + xml.nodeType);
            return o;
        },
        toJson: function(o, name, ind) {
            var json = name ? ("\"" + name + "\"") : "";
            if (o instanceof Array) {
                for (var i = 0, n = o.length; i < n; i++)
                    o[i] = X.toJson(o[i], "", ind + "\t");
                json += (name ? ":[" : "[") + (o.length > 1 ? ("\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind) : o.join("")) + "]";
            }
            else if (o == null)
                json += (name && ":") + "null";
            else if (typeof(o) == "object") {
                var arr = [];
                for (var m in o)
                    arr[arr.length] = X.toJson(o[m], m, ind + "\t");
                json += (name ? ":{" : "{") + (arr.length > 1 ? ("\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind) : arr.join("")) + "}";
            }
            else if (typeof(o) == "string")
                json += (name && ":") + "\"" + o.toString() + "\"";
            else
                json += (name && ":") + o.toString();
            return json;
        },
        innerXml: function(node) {
            var s = ""
            if ("innerHTML" in node)
                s = node.innerHTML;
            else {
                var asXml = function(n) {
                    var s = "";
                    if (n.nodeType == 1) {
                        s += "<" + n.nodeName;
                        for (var i = 0; i < n.attributes.length; i++)
                            s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                        if (n.firstChild) {
                            s += ">";
                            for (var c = n.firstChild; c; c = c.nextSibling)
                                s += asXml(c);
                            s += "</" + n.nodeName + ">";
                        }
                        else
                            s += "/>";
                    }
                    else if (n.nodeType == 3)
                        s += n.nodeValue;
                    else if (n.nodeType == 4)
                        s += "<![CDATA[" + n.nodeValue + "]]>";
                    return s;
                };
                for (var c = node.firstChild; c; c = c.nextSibling)
                    s += asXml(c);
            }
            return s;
        },
        escape: function(txt) {
            return txt.replace(/[\\]/g, "\\\\")
                .replace(/[\"]/g, '\\"')
                .replace(/[\n]/g, '\\n')
                .replace(/[\r]/g, '\\r');
        },
        removeWhite: function(e) {
            e.normalize();
            for (var n = e.firstChild; n;) {
                if (n.nodeType == 3) {
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                        var nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    }
                    else
                        n = n.nextSibling;
                }
                else if (n.nodeType == 1) {  // element node
                    X.removeWhite(n);
                    n = n.nextSibling;
                }
                else                      // any other node
                    n = n.nextSibling;
            }
            return e;
        }
    };
    if (xml.nodeType == 9) // document node
        xml = xml.documentElement;
    /*
        Return Xml to Json
    var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
    return "{" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "}";
    */

    return X.toObj(X.removeWhite(xml));
}

function getParentUrl() {
    // If the referrer is gameplayer.io, else we just return href.
    // The referrer can be set by Spil games.
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        // now check if ref is not empty, otherwise we return a default.
        const defaultUrl = 'https://gamedistribution.com/';
        if (document.referrer.indexOf('?ref=') !== -1) {
            let returnedResult = document.referrer.substr(document.referrer.indexOf('?ref=') + 5);
            if (returnedResult === '{portal%20name}' || returnedResult === '{portal name}') {
                returnedResult = defaultUrl;
            } else {
                if (returnedResult.indexOf('http') !== 0) {
                    returnedResult = 'http://' + returnedResult;
                } else {
                    returnedResult = defaultUrl;
                }
            }
            return returnedResult;
        } else {
            return defaultUrl;
        }
    }
    return (window.location !== window.parent.location) ? document.referrer : document.location.href;
}

export {
    extendDefaults,
    serialize,
    fetchData,
    log,
    getCookie,
    setCookie,
    sessionId,
    getXMLData,
    parseXML,
    XML2Object,
    getParentUrl
}