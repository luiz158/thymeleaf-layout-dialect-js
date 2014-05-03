var thURL = "http://www.thymeleaf.org", thScriptName = "thymol.js", thPrefix = "th:", thDataPrefix = "data-th-", thVersion = "2.0.0-SNAPSHOT", thReleaseDate = "not yet!", thCache = {}, thExpressionObjects, thPreExecutionFunctions, thPostExecutionFunctions, thDefaultPrecision = 10, thDefaultProtocol = "file:///", thDefaultLocale = "en", ThUtils, ThParser, thymol;

(function(DOMParser) {
    var DOMParser_proto = DOMParser.prototype, real_parseFromString = DOMParser_proto.parseFromString;
    try {
        if (new DOMParser().parseFromString("", "text/html")) {
            return;
        }
    } catch (ignore) {}
    DOMParser_proto.parseFromString = function(markup, type) {
        var res, doc;
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
            doc = document.implementation.createHTMLDocument("");
            if (markup.toLowerCase().indexOf("<!doctype") > -1) {
                doc.documentElement.innerHTML = markup;
            } else {
                doc.body.innerHTML = markup;
            }
            res = doc;
        } else {
            res = real_parseFromString.apply(this, arguments);
        }
        return res;
    };
})(DOMParser);

(function($) {
    $.fn.extend({
        getComments: function() {
            return this.filter(function() {
                return this.nodeType === 8;
            });
        },
        getThDecorated: function(thInst) {
            var i, iLength, j, jLength, instances = this.filter(thInst.escpName).add(this.filter(thInst.escpSynonym)), result = null, expanded = false;
            for (i = 0, iLength = instances.length; i < iLength; i++) {
                if (instances[i]) {
                    for (j = 0, jLength = instances[i].attributes.length; j < jLength; j++) {
                        if (instances[i].attributes[j]) {
                            if (thInst.name == instances[i].attributes[j].name || thInst.synonym == instances[i].attributes[j].name) {
                                expanded = ThUtils.processElement(thInst.process, instances[i], instances[i].attributes[j], thInst);
                                if (expanded) {
                                    if (result === null) {
                                        result = [];
                                    }
                                    result.push(instances[i]);
                                }
                            }
                        }
                    }
                }
            }
            return result;
        }
    });
})($);

ThUtils = function() {
    function mergeVars(thiz, other) {
        var current = thiz, prop = null;
        if (!current) {
            current = {};
        }
        for (prop in other) {
            if (other.hasOwnProperty(prop)) {
                if (prop) {
                    if (!current[prop]) {
                        current[prop] = other[prop];
                    }
                }
            }
        }
        return current;
    }
    function processElement(func, element, arg, obj) {
        var result = null, parent = element.parentElement;
        if (!thymol.isFragmentChild(element)) {
            if (!element.thObjectVar) {
                parent = element.parentElement;
                while (parent) {
                    if (parent.thObjectVar) {
                        element.thObjectVar = parent.thObjectVar;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            parent = element.parentElement;
            while (parent) {
                if (parent.thLocalVars) {
                    element.thLocalVars = mergeVars(element.thLocalVars, parent.thLocalVars);
                    break;
                }
                parent = parent.parentElement;
            }
            result = func(element, arg, obj);
        }
        return result;
    }
    function unQuote(param) {
        var par = param, pared;
        if (par) {
            if (typeof par === "string") {
                par = par.trim();
                if (par.charAt(0) == '"') {
                    if (par.charAt(par.length - 1) == '"') {
                        pared = par.substring(1, par.length - 1);
                        if (pairParity(pared, '"', '"') == 0) {
                            par = pared;
                        }
                    }
                } else if (par.charAt(0) == "'") {
                    if (par.charAt(par.length - 1) == "'") {
                        pared = par.substring(1, par.length - 1);
                        if (pairParity(pared, "'", "'") == 0) {
                            par = pared;
                        }
                    }
                }
            }
        }
        return par;
    }
    function unParenthesise(param) {
        var par = param, pared;
        if (par) {
            if (typeof par === "string") {
                par = par.trim();
                if (par.charAt(0) == "(") {
                    if (par.charAt(par.length - 1) == ")") {
                        pared = par.substring(1, par.length - 1).trim();
                        if (pairParity(pared, "(", ")") == 0) {
                            par = pared;
                        }
                    }
                }
            }
        }
        return par;
    }
    function pairParity(str, left, right) {
        var i, ch, strLength = str.length, parity = 0;
        for (i = 0; i < strLength; i++) {
            ch = str.charAt(i);
            if (ch == left) {
                parity++;
            } else if (ch == right) {
                parity--;
                if (parity < 0) {
                    break;
                }
            }
        }
        return parity;
    }
    function unBracket(param) {
        var par = param, pared;
        if (typeof par === "string") {
            par = par.trim();
        }
        if (par) {
            if (par.charAt(0) == "[") {
                if (par.charAt(par.length - 1) == "]") {
                    pared = par.substring(1, par.length - 1);
                    if (pairParity(pared, "[", "]") == 0) {
                        par = pared;
                    }
                }
            }
        }
        return par;
    }
    function getToPrecision(n, p) {
        if (typeof p === "undefined") {
            return n;
        }
        var up = thDefaultPrecision, ndp = 0, s, sl, dp, v;
        if (p > up) {
            up = p;
        } else {
            s = n.toString();
            sl = s.length;
            dp = s.indexOf(".");
            if (dp >= 0) {
                ndp = sl - 1 - dp;
            }
            if (ndp > up) {
                v = n.toPrecision(ndp + 1);
                v = truncateDecimals(v);
                s = v.toString();
                sl = s.length;
                if (dp >= 0) {
                    ndp = sl - 1 - dp;
                }
            }
            if (p > ndp) {
                up = p;
            } else if (ndp < up) {
                up = ndp;
            }
        }
        v = parseFloat(n);
        return v.toFixed(up);
    }
    function truncateDecimals(valp) {
        var val = valp, iLimit = valp.length - 1, i;
        for (i = iLimit; i >= 0; i--) {
            if (val.charAt(i) === "0") {
                val = val.substr(0, i);
            } else {
                break;
            }
        }
        return val;
    }
    function getDecimalDigits(val) {
        var digits = 0, s, dp;
        s = val.toString();
        dp = s.indexOf(".") + 1;
        if (dp > 0) {
            digits = s.length - dp;
        }
        return digits;
    }
    function testLiteralFalse(initial) {
        var result = false, val;
        if (typeof initial === "string") {
            val = initial.toLowerCase();
            result = val == "false" || val == "off" || val == "no";
        }
        return result;
    }
    function renderMessage(msg, values) {
        var result = msg, i, iLimit;
        if (Object.prototype.toString.call(values) == "[object Array]") {
            for (i = 0, iLimit = values.length; i < iLimit; i++) {
                result = renderMessageArg(result, i, values[i]);
            }
        } else {
            result = renderMessageArg(msg, 0, values);
        }
        return result;
    }
    function renderMessageArg(msg, index, value) {
        var result = msg, splits, i, iLimit, iUpper;
        splits = msg.split("{" + index + "}");
        if (splits.length > 0) {
            result = "";
            for (i = 0, iLimit = splits.length, iUpper = iLimit - 1; i < iLimit; i++) {
                result += splits[i];
                if (i < iUpper) {
                    result += value;
                }
            }
        }
        return result;
    }
    return {
        processElement: processElement,
        unQuote: unQuote,
        unParenthesise: unParenthesise,
        unBracket: unBracket,
        getToPrecision: getToPrecision,
        getDecimalDigits: getDecimalDigits,
        testLiteralFalse: testLiteralFalse,
        renderMessage: renderMessage
    };
}();

function makeContext(contextNameParam, varAccessorParam) {
    var jsonDeclSpec = "(?:\\W*([\\'][A-Za-z]+(?:\\w|[$])*[\\'])\\s*[:])?\\s*([#][A-Za-z]+(?:\\w|[$])*)(?:\\W|[^$])*", jsonDeclExpr = new RegExp(jsonDeclSpec), context = new Array();
    context.contextName = contextNameParam;
    context.varAccessor = varAccessorParam;
    context.varStore = [];
    context.varNamePrefix = "";
    if (typeof varAccessorParam === "undefined") {
        context.varAccessor = new ThVarsAccessor(context.varStore, "varStore");
    }
    context.varNamePrefix = context.varAccessor.arrayName + "[";
    context.getJSONView = function(param, rootVal) {
        var pType = typeof param, view = "", objType;
        if (pType === "string") {
            view = view + "'" + param + "'";
        } else if (pType === "number" || pType === "boolean") {
            view = view + param;
        } else if (pType === "object") {
            if (param instanceof Object) {
                objType = Object.prototype.toString.call(param);
                if ("[object Array]" === objType) {
                    view = this.getJSONViewArray(param, false);
                } else if ("[object Object]" === objType) {
                    view = this.getJSONViewObject(param, false);
                }
                view = "#" + view;
            }
        }
        return view;
    };
    context.init = function() {
        var persisted = top.name, paramRow, paramName, params, i, iLimit, paramValue;
        if (persisted && persisted !== "") {
            params = this.javascriptify(persisted);
            if (params && params.length > 0) {
                for (i = 0, iLimit = params.length; i < iLimit; i++) {
                    paramRow = params[i];
                    if (paramRow) {
                        paramName = paramRow[0];
                        if (paramName) {
                            paramValue = paramRow[1];
                            this.createVariable(paramName, paramValue);
                        }
                    }
                }
            }
        }
    };
    context.getJSONViewObject = function(param, rootVal) {
        var isRoot = true, key = null, view = "{", value, identifier, definition, suffix, instanceNamePrefix, isTaken, i, iLimit, instanceValue;
        if (typeof rootVal === "boolean") {
            isRoot = rootVal;
        }
        for (key in param) {
            if (key) {
                value = param[key];
                if (typeof value !== "function") {
                    if (view != "{") {
                        view = view + ",";
                    }
                    identifier = this.getJSONView(key, false);
                    definition = this.getJSONView(value, false);
                    view = view + identifier + ":";
                    if (!isRoot && typeof value === "object") {
                        suffix = 1;
                        instanceNamePrefix = key + "$";
                        instanceName = null;
                        isTaken = false;
                        do {
                            instanceName = instanceNamePrefix + suffix++;
                            instanceValue = context[instanceName];
                            if (instanceValue === null || typeof instanceValue === "undefined") {
                                isTaken = false;
                                for (i = 0, iLimit = varStore.length; i < iLimit; i++) {
                                    if (instanceName === varStore[i][0]) {
                                        isTaken = true;
                                        break;
                                    }
                                }
                                if (!isTaken) {
                                    this.addAttribute(instanceName, definition);
                                }
                            }
                        } while (isTaken);
                        if (instanceName !== null) {
                            view = view + "#" + instanceName;
                        }
                    } else {
                        view = view + definition;
                    }
                }
            }
        }
        view = view + "}";
        return view;
    };
    context.getJSONViewArray = function(param, rootVal) {
        var view = "[", i;
        for (i = 0; i < param.length; i++) {
            view = view + this.getJSONView(param[i], false);
            if (i < param.length - 1) {
                view = view + ",";
            }
        }
        view = view + "]";
        return view;
    };
    context.getAttribute = function(name) {
        return context[name];
    };
    context.addAttribute = function(name, value) {
        var entry = [];
        entry[0] = name;
        entry[1] = value;
        varStore.push(entry);
    };
    context.serialise = function() {
        varStore = [];
        var serialised = "[", key = null, value, cn, view, name, i, iLimit;
        for (key in context) {
            if (key) {
                value = context[key];
                if (value != null && typeof value === "object") {
                    cn = Object.prototype.toString.call(value);
                    if ("[object Array]" !== cn && !(value instanceof Clazz) && !(value instanceof ThVarsAccessor)) {
                        if (serialised !== "[") {
                            serialised = serialised + ",";
                        }
                        view = this.getJSONView(value, true);
                        serialised = serialised + "[";
                        serialised = serialised + '"' + key + '"';
                        serialised = serialised + ",";
                        serialised = serialised + '"' + view + '"';
                        serialised = serialised + "]";
                    }
                }
            }
        }
        for (i = 0, iLimit = varStore.length; i < iLimit; i++) {
            name = varStore[i][0];
            view = varStore[i][1];
            serialised = serialised + ",[";
            serialised = serialised + '"' + name + '"';
            serialised = serialised + ",";
            serialised = serialised + '"' + view + '"';
            serialised = serialised + "]";
        }
        serialised = serialised + "]";
        return serialised;
    };
    context.javascriptify = function(fn) {
        return new Function("return " + fn)();
    };
    context.createVariable = function(name, valParam, isReq) {
        var value = valParam, param, tt, literalBoolean, strValue, initial, existing, newArray;
        param = value;
        if (!(value instanceof ThParam)) {
            tt = typeof valParam;
            if (tt !== "function" && tt !== "object") {
                if (tt === "string") {
                    value = decodeURIComponent(value);
                }
                if (tt === "boolean" || tt === "number") {
                    param = new ThParam(value);
                } else if (value || value === "") {
                    literalBoolean = ThUtils.testLiteralFalse(value);
                    if (literalBoolean) {
                        param = false;
                    } else {
                        strValue = new String(value);
                        initial = strValue.trim();
                        if (initial.charAt(0) === "#") {
                            initial = initial.substring(1);
                            try {
                                param = this.createJSONVariable(initial);
                            } catch (err) {
                                if (err instanceof ReferenceError) {}
                                if (err instanceof EvalError) {}
                                if (param == null) {
                                    param = new ThParam(value);
                                }
                            }
                        } else {
                            param = new ThParam(strValue.toString());
                        }
                    }
                }
            }
        }
        if (isReq) {
            existing = context[name];
            if (typeof existing !== "undefined" && existing !== null) {
                if (Object.prototype.toString.call(existing) === "[object Array]") {
                    existing.push(param);
                } else {
                    if (debug) {
                        window.alert('request parameters should be of type string array "' + name + '"');
                    }
                }
            } else {
                newArray = new Array();
                newArray["class"] = {};
                newArray["class"]["name"] = "[Thymol.ThParam]";
                newArray.push(param);
                context[name] = newArray;
            }
        } else {
            context[name] = param;
        }
        return param;
    };
    context.createJSONVariable = function(initial) {
        var current = initial.trim(), parts = " ", substIndex, token, re, vName, obj, result;
        substIndex = this.varAccessor.length() + 1;
        while (parts) {
            parts = current.match(jsonDeclExpr);
            if (parts && parts.length > 2) {
                token = parts[2];
                token = token.replace(/[\']/g, "[']").replace(/[$]/g, "[$]");
                re = new RegExp(token);
                vName = this.varNamePrefix + substIndex + "]";
                obj = new Object();
                obj.name = parts[2].substring(1);
                this.varAccessor.set(substIndex, obj);
                substIndex = substIndex + 1;
                current = current.replace(re, "'" + vName + "'", "g");
            }
        }
        current = current.replace(/[\']/g, '"');
        result = $.parseJSON(current);
        if ("[object Array]" !== Object.prototype.toString.call(result)) {
            result = new ThObject(result);
        }
        return result;
    };
    context.resolveJSONReferences = function() {
        var key = null, param, prop = null, val, ref, subst;
        for (key in context) {
            if (key) {
                param = context[key];
                if (param != null && typeof param === "object") {
                    if (!(param instanceof ThVarsAccessor) && !(param instanceof Clazz)) {
                        if (!(param instanceof ThParam)) {
                            for (prop in param) {
                                if (prop) {
                                    val = param[prop];
                                    if (typeof val === "string") {
                                        if (val.indexOf(this.varNamePrefix) == 0) {
                                            subst = null;
                                            if (prop.match(/\d*/)) {
                                                ref = val.substring(this.varNamePrefix.length, val.length - 1);
                                                ref = this.varAccessor.get(ref);
                                                subst = context[ref.name];
                                            } else {
                                                subst = context[prop];
                                            }
                                            param[prop] = subst;
                                        }
                                    }
                                }
                            }
                        } else if (typeof param.value === "string" && param.value.charAt(0) == "#") {
                            subst = context[param.value.substring(1)];
                            context[key] = subst;
                        }
                    }
                }
            }
        }
    };
    return context;
}

function ThSet() {
    this.that = this;
    this.setSize = 0;
    this.isContent = function(k) {
        return this.hasOwnProperty(k) && typeof this[k] !== "function" && k !== "that" && k !== "setSize";
    };
    this.add = function(k) {
        var contained = typeof this[k] !== "undefined";
        this[k] = k;
        if (contained !== (typeof this[k] !== "undefined")) {
            this.setSize++;
        }
    };
    this.addAll = function(other) {
        var k = null, value;
        for (k in other) {
            if (other.hasOwnProperty(k)) {
                value = other[k];
                if (typeof value !== "function") {
                    add(value);
                }
            }
        }
    };
    this.clear = function() {
        for (var k in this) {
            if (this.hasOwnProperty(k)) {
                delete this[k];
            }
        }
        setSize = 0;
    };
    this.contains = function(k) {
        return typeof this[k] !== "undefined";
    };
    this.containsAll = function(keys) {
        var keySet = keys, k = null;
        if (typeof keys === "Array" || Object.prototype.toString.call(keys) === "[object Array]") {
            keySet = ThSet.prototype.fromArray(keys);
        }
        for (k in keySet) {
            if (keySet.hasOwnProperty(k)) {
                if (typeof this[k] === "undefined") {
                    return false;
                }
            }
        }
        return true;
    };
    this.isEmpty = function() {
        return this.setSize === 0;
    };
    this.size = function() {
        return this.setSize;
    };
    this.remove = function(k) {
        var contained = typeof this[k] !== "undefined";
        delete this[k];
        if (contained !== (typeof this[k] !== "undefined")) {
            this.setSize--;
        }
    };
    this.toArray = function() {
        return getArray(this);
    };
    this.toString = function() {
        var array = getArray();
        return array.toString();
    };
    function getArray(obj) {
        var array = [], k = null, value;
        for (k in obj) {
            if (obj.hasOwnProperty(k) && k !== "that" && k !== "setSize") {
                value = obj[k];
                if (typeof value !== "function") {
                    array.push(value);
                }
            }
        }
        return array;
    }
}

ThSet.prototype.fromArray = function(array) {
    var set = new ThSet(), i, iLimit;
    for (i = 0, iLimit = array.length; i < iLimit; i++) {
        set.add(array[i]);
    }
    return set;
};

function ThMap() {
    ThSet.apply(this);
    this.containsKey = function(k) {
        return this.contains(k);
    };
    this.containsValue = function(target) {
        var k = null, value;
        for (k in this.that) {
            if (this.that.hasOwnProperty(k) && k !== "that") {
                value = this.that[k];
                if (value === target) {
                    return true;
                }
            }
        }
        return false;
    };
    this.entrySet = function() {
        return this.that;
    };
    this.get = function(k) {
        return this.that[k];
    };
    this.keySet = function() {
        return this.that;
    };
    this.put = function(k, v) {
        var contained = typeof this[k] !== "undefined";
        this.that[k] = v;
        if (contained !== (typeof this[k] !== "undefined")) {
            this.setSize++;
        }
    };
    this.putAll = function(t) {
        for (var k in t) {
            put(k, t[k]);
        }
    };
    this.values = function() {
        return this.that;
    };
}

ThMap.prototype = new ThSet();

ThMap.prototype.constructor = ThMap;

function ThError(message, element) {
    this.name = "ThError";
    this.message = message || "Default Message";
    if (element !== null && typeof element !== "undefined" && element.isBlockChild) {
        this.suppress = true;
    } else {
        this.element = element || {};
        this.suppress = false;
    }
}

ThError.prototype = new Error();

ThError.prototype.constructor = ThError;

function ThParam(valueArg) {
    this.value = valueArg;
    this["class"] = new Clazz("Thymol.ThParam");
    this.getBooleanValue = function() {
        return !ThUtils.testLiteralFalse(this.value);
    };
    this.toString = function() {
        return this.value;
    };
    this.getNumericValue = function() {
        return Number(this.value);
    };
}

function ThObject(dolly) {
    for (prop in dolly) {
        if (dolly.hasOwnProperty(prop)) {
            if (prop) {
                if (!this[prop]) {
                    this[prop] = dolly[prop];
                }
            }
        }
    }
    this["class"] = new Clazz("Thymol.ThObject");
    this.toNonThObject = function() {
        var plain = {};
        for (prop in this) {
            if (this.hasOwnProperty(prop)) {
                if (prop) {
                    if (!plain[prop]) {
                        if (prop !== "toNonThObject") {
                            if (prop !== "class" || prop === "class" && this[prop] !== null && this[prop].name !== "Thymol.ThObject") {
                                plain[prop] = this[prop];
                            }
                        }
                    }
                }
            }
        }
        return plain;
    };
}

function ThVarsAccessor(storeArg, storeNameArg) {
    this.store = storeArg;
    this.arrayName = storeNameArg;
    this.length = function() {
        return this.store.length;
    };
    this.get = function(name) {
        return this.store[name];
    };
    this.set = function(name, value) {
        this.store[name] = value;
    };
}

thymol = function() {
    (function() {
        var htmlTag = $("html")[0], nsspec;
        $(htmlTag.attributes).each(function() {
            if (thURL == this.value) {
                nsspec = this.localName.split(":");
                if (nsspec.length > 0) {
                    thPrefix = nsspec[nsspec.length - 1] + ":";
                    return;
                }
            }
        });
    })();
    Thymol.processConditional = function(element, attr) {
        return new Thymol().processConditional(element, attr);
    };
    Thymol.processSwitch = function(element, attr) {
        return new Thymol().processSwitch(element, attr);
    };
    Thymol.processRemove = function(element, attr) {
        return new Thymol().processRemove(element, attr);
    };
    Thymol.processAttr = function(element, attr) {
        return new Thymol().processAttr(element, attr);
    };
    Thymol.processPairedAttr = function(element, attr) {
        return new Thymol().processPairedAttr(element, attr);
    };
    Thymol.processAssert = function(element, attr) {
        return new Thymol().processAssert(element, attr);
    };
    Thymol.processFragment = function(element, attr) {
        return new Thymol().processFragment(element, attr);
    };
    Thymol.processObject = function(element, attr) {
        return new Thymol().processObject(element, attr);
    };
    Thymol.processInline = function(element, attr) {
        return new Thymol().processInline(element, attr);
    };
    Thymol.processText = function(element, attr) {
        return new Thymol().processText(element, attr);
    };
    Thymol.processWith = function(element, attr) {
        return new Thymol().processWith(element, attr);
    };
    Thymol.processSpecAttrMod = function(element, attr, obj) {
        return new Thymol().processSpecAttrMod(element, attr, obj);
    };
    Thymol.processFixedValBoolAttr = function(element, attr, obj) {
        return new Thymol().processFixedValBoolAttr(element, attr, obj);
    };
    Thymol.processEach = function(element, attr, obj) {
        return new Thymol().processEach(element, attr, obj);
    };
    var thThymeleafAttrList = [], thThymeleafPrefixList = [ thPrefix, thDataPrefix ], usingNullPrefix = false, specAttrModList = [ "abbr", "accept", "accept-charset", "accesskey", "action", "align", "alt", "archive", "audio", "autocomplete", "axis", "background", "bgcolor", "border", "cellpadding", "cellspacing", "challenge", "charset", "cite", "class", "classid", "codebase", "codetype", "cols", "colspan", "compact", "content", "contenteditable", "contextmenu", "data", "datetime", "dir", "draggable", "dropzone", "enctype", "for", "form", "formaction", "formenctype", "formmethod", "formtarget", "frame", "frameborder", "headers", "height", "high", "href", "hreflang", "hspace", "http-equiv", "icon", "id", "keytype", "kind", "label", "lang", "list", "longdesc", "low", "manifest", "marginheight", "marginwidth", "max", "maxlength", "media", "method", "min", "name", "optimum", "pattern", "placeholder", "poster", "preload", "radiogroup", "rel", "rev", "rows", "rowspan", "rules", "sandbox", "scheme", "scope", "scrolling", "size", "sizes", "span", "spellcheck", "src", "srclang", "standby", "start", "step", "style", "summary", "tabindex", "target", "title", "type", "usemap", "value", "valuetype", "vspace", "width", "wrap", "xmlbase", "xmllang", "xmlspace" ], fixedValBoolAttrList = [ "async", "autofocus", "autoplay", "checked", "controls", "declare", "default", "defer", "disabled", "formnovalidate", "hidden", "ismap", "loop", "multiple", "novalidate", "nowrap", "open", "pubdate", "readonly", "required", "reversed", "scoped", "seamless", "selected" ], eventAttrList = [ "onabort", "onafterprint", "onbeforeprint", "onbeforeunload", "onblur", "oncanplay", "oncanplaythrough", "onchange", "onclick", "oncontextmenu", "ondblclick", "ondrag", "ondragend", "ondragenter", "ondragleave", "ondragover", "ondragstart", "ondrop", "ondurationchanged", "onemptied", "onended", "onerror", "onfocus", "onformchange", "onforminput", "onhashchange", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload", "onloadeddata", "onloadedmetadata", "onloadstart", "onmessage", "onmousedown", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onmousewheel", "onoffline", "ononline", "onpause", "onplay", "onplaying", "onpopstate", "onprogress", "onratechange", "onreadystatechange", "onredo", "onreset", "onresize", "onscroll", "onseeked", "onseeking", "onselect", "onshow", "onstalled", "onstorage", "onsubmit", "onsuspend", "ontimeupdate", "onundo", "onunload", "onvolumechange", "onwaiting" ], thAltTitle = new ThAttr("alt-title", Thymol.processPairedAttr, 990, thThymeleafAttrList), thAssert = new ThAttr("assert", Thymol.processAssert, 1550, thThymeleafAttrList), thAttr = new ThAttr("attr", Thymol.processAttr, 700, thThymeleafAttrList), thAttrAppend = new ThAttr("attrappend", Thymol.processAttr, 900, thThymeleafAttrList), thAttrPrepend = new ThAttr("attrprepend", Thymol.processAttr, 800, thThymeleafAttrList), thCase = new ThAttr("case", null, 275, thThymeleafAttrList), thClassAppend = new ThAttr("classappend", Thymol.processAttr, 1100, thThymeleafAttrList), thEach = new ThAttr("each", Thymol.processEach, 200, thThymeleafAttrList), thFragment = new ThAttr("fragment", Thymol.processFragment, 1500, thThymeleafAttrList), thObject = new ThAttr("object", Thymol.processObject, 500, thThymeleafAttrList), thIf = new ThAttr("if", Thymol.processConditional, 300, thThymeleafAttrList), thInline = new ThAttr("inline", Thymol.processInline, 1e3, thThymeleafAttrList), thInclude = new ThAttr("include", null, 100), thLangXmlLang = new ThAttr("lang-xmllang", Thymol.processPairedAttr, 990, thThymeleafAttrList), thRemove = new ThAttr("remove", Thymol.processRemove, 1600), thReplace = new ThAttr("replace", null, 100), thSubstituteby = new ThAttr("substituteby", null, 100), thSwitch = new ThAttr("switch", Thymol.processSwitch, 250, thThymeleafAttrList), thText = new ThAttr("text", Thymol.processText, 1300, thThymeleafAttrList), thUnless = new ThAttr("unless", Thymol.processConditional, 400, thThymeleafAttrList), thUtext = new ThAttr("utext", Thymol.processText, 1400, thThymeleafAttrList), thWith = new ThAttr("with", Thymol.processWith, 600, thThymeleafAttrList), thBlock = new ThAttr("block"), endThBlockName = "/" + thBlock.name, thBlockSynonym = "th-block", endThBlockSynonym = "/" + thBlockSynonym, mappings = null, messages = null, debug = null, root = null, path = null, allowNullText = null, protocol = null, locale = null, numberSpec = "[+-]?[0-9]*?[.]?[0-9]*?", numericSpec = "^" + numberSpec + "$", varSpec2 = "[$*#@]{1}{(!?[^}]*)}", varSpec3 = "[$*#@]{1}{(.*)}$", nonURLSpec = "[$*#]{1}{(?:!?[^}]*)}", textFuncSynonym = "~~~~", varParSpec = "([^(]*)\\s*[(]([^)]*?)[)]", domSelectSpec = "([/]{1,2})?(\\w*(?:[\\(][\\)])?)?([^\\[]\\S\\w*(?:[\\(][\\)])?[/]*(?:[\\./#]?[^\\[]\\S\\w*(?:[\\(][\\)])?[/]*)*)?([\\[][^\\]]*?[\\]])?", litSubstSpec = "\\.*?([\\|][^\\|]*?[\\|])\\.*?", varRefExpr = /([$#]{.*?})/, literalTokenExpr = /^[a-zA-Z0-9\[\]\.\-_]*$/, linkExpr = /^@{(.*?)([\(][^\)]*?[\)])?}$/, startParserLevelCommentExpr = /^\s*\/\*\s*$/, endParserLevelCommentExpr = /^\s*\*\/\s*$/, startParserLevelCommentExpr2 = /^\/\*[^\/].*/, endParserLevelCommentExpr2 = /.*[^\/]\*\/$/, prototypeOnlyCommentEscpExpr = /\/\*\/(.*)\/\*\//, textInlineCommentExpr = /\[\[(.*)\]\]/, javascriptInlineCommentExpr = /\/\*\[\[(.*)\]\]\*\//, javascriptInlineRemainderExpr = /\s*(?:['][^']*['])*(?:["][^"]*["])*(?:[\(][^\(\)]*[\)])*(?:[\{][^\{\}]*[\}])*(?:[\[][^\[\]]*[\]])*((?:[;,\(\)\[\]:\{\}](?=(?:\s*\/\/.*?(?:\n|$)))(?:\s*\/\/.*?(?:\n|$)))|(?:\s*\/\/.*?(?:\n|$))|(?:[;,\(\)\[\]:\{\}](?=(?:\s*(?:\n|$)))(?:\s*(?:\n|$)))|(?:\s*(?:\n|$)))/, varExpr = new RegExp(varSpec2), varExpr3 = new RegExp(varSpec3), nonURLExpr = new RegExp(nonURLSpec), numericExpr = new RegExp(numericSpec), varParExpr = new RegExp(varParSpec), domSelectExpr = new RegExp(domSelectSpec), litSubstExpr = new RegExp(litSubstSpec);
    appendToAttrList(thThymeleafAttrList, Thymol.processFixedValBoolAttr, 1e3, fixedValBoolAttrList);
    appendToAttrList(thThymeleafAttrList, Thymol.processSpecAttrMod, 1e3, specAttrModList);
    appendToAttrList(thThymeleafAttrList, Thymol.processSpecAttrMod, 1e3, eventAttrList);
    thThymeleafAttrList.sort(precedenceOrder);
    if (locale === null) {}
    function precedenceOrder(a, b) {
        return a.precedence - b.precedence;
    }
    function Thymol() {}
    function ThNode(thDocParam, visitedParam, parentDocParam, firstChildParam, nextSiblingParam, fileNameParam, fragNameParam, isNodeParam, elementParam) {
        this.thDoc = thDocParam;
        this.visited = visitedParam;
        this.parentDoc = parentDocParam;
        this.firstChild = firstChildParam;
        this.nextSibling = nextSiblingParam;
        this.fileName = fileNameParam;
        this.fragName = fragNameParam;
        this.isNode = isNodeParam;
        this.element = elementParam;
    }
    function ThAttr(suffix, func, prec, list, pref) {
        var prefix, escpPrefix;
        if (typeof pref === "undefined") {
            prefix = thPrefix;
        } else {
            prefix = pref;
        }
        if (prefix !== null) {
            escpPrefix = prefix.substring(0, prefix.length - 1) + "\\:";
        } else {
            prefix = "";
            escpPrefix = "";
        }
        this.suffix = suffix;
        this.name = prefix + suffix;
        this.synonym = thDataPrefix + suffix;
        this.escpName = "[" + escpPrefix + suffix + "]";
        this.escpSynonym = "[" + this.synonym + "]";
        this.precedence = prec;
        if (!(typeof list === "undefined")) {
            list.push(this);
        }
        this.process = function() {
            window.alert('unsupported processing function for attribute "' + this.name + '"');
        };
        if (!(typeof func === "undefined")) {
            this.process = func;
        }
        this.disable = function() {
            this.name = prefix + "nonesuch";
            this.escpName = "[" + escpPrefix + "nonesuch]";
            this.escpSynonym = "[" + thDataPrefix + "nonesuch]";
        };
    }
    function appendToAttrList(attrList, func, prec, attrArray) {
        var j, jLimit = attrArray.length, tha;
        for (j = 0; j < jLimit; j++) {
            tha = new ThAttr(attrArray[j], func, prec, attrList);
        }
    }
    function init() {
        if (typeof thExpressionObjects === "undefined" || thExpressionObjects === null) {
            thExpressionObjects = {};
        }
        thExpressionObjects["#object"] = {};
        thExpressionObjects["#locale"] = {};
        thExpressionObjects["#ctx"] = [];
        thExpressionObjects["#ctx"]["variables"] = {};
        var accessor = undefined, i, iLimit, j, jLimit, base;
        if (typeof thVars !== "undefined") {
            accessor = new ThVarsAccessor(thVars, "thVars");
        }
        this.applicationContext = makeContext("application", accessor);
        this.sessionContext = makeContext("session", undefined);
        this.sessionContext.persist = function() {
            var save = this.serialise();
            top.name = save;
        };
        this.requestContext = makeContext("request", undefined);
        this.booleanAndNullTokens = new Array();
        this.booleanAndNullTokens["null"] = this.applicationContext.createVariable("null", null);
        this.booleanAndNullTokens["true"] = this.applicationContext.createVariable("true", true);
        this.booleanAndNullTokens["false"] = this.applicationContext.createVariable("false", false);
        protocol = Thymol.prototype.getThParam("thProtocol", false, false, thDefaultProtocol);
        debug = Thymol.prototype.getThParam("thDebug", true, false, false);
        root = Thymol.prototype.getThParam("thRoot", false, true, "");
        path = Thymol.prototype.getThParam("thPath", false, true, "");
        allowNullText = Thymol.prototype.getThParam("thAllowNullText", true, false, true);
        locale = Thymol.prototype.getThParam("thLocale", false, false, thDefaultLocale);
        if (typeof thPreExecutionFunctions === "undefined" || thPreExecutionFunctions === null) {
            thPreExecutionFunctions = [];
        }
        if (typeof thPostExecutionFunctions === "undefined" || thPostExecutionFunctions === null) {
            thPostExecutionFunctions = [];
        }
        $.ajaxSetup({
            async: false,
            isLocal: true,
            dataType: "text"
        });
        if (!(typeof thVars === "undefined")) {
            for (i = 0, iLimit = thVars.length; i < iLimit; i++) {
                this.applicationContext.createVariable(thVars[i][0], thVars[i][1]);
            }
        }
        (function(app, req) {
            var e, f, a = /\+/g, r = /([^&=]+)=?([^&]*)/g, d = function(s) {
                return decodeURIComponent(s.replace(a, " "));
            }, q = window.location.search.substring(1), surl, scriptUrl = "";
            $("script").each(function() {
                surl = this.src;
                if (surl.indexOf(thScriptName) >= 0) {
                    scriptUrl = d(surl);
                    return false;
                }
            });
            while (e = r.exec(scriptUrl)) {
                f = e[1].split("?");
                switch (f[1]) {
                  case "thProtocol":
                    protocol = e[2];
                    break;

                  case "thDebug":
                    debug = e[2];
                    break;

                  case "thRoot":
                    root = e[2];
                    break;

                  case "thPath":
                    path = e[2];
                    break;

                  case "thAllowNullText":
                    allowNullText = e[2];
                    break;

                  case "thLocale":
                    locale = e[2];
                    break;

                  default:
                    app.createVariable(e[1], e[2]);
                }
            }
            while (e = r.exec(q)) {
                req.createVariable(d(e[1]), e[2], true);
            }
        })(this.applicationContext, this.requestContext);
        this.applicationContext.resolveJSONReferences();
        preExecute(this.applicationContext);
        thExpressionObjects["#ctx"]["variables"] = this.applicationContext;
        thExpressionObjects["#vars"] = this.applicationContext;
        thExpressionObjects["#root"] = this.applicationContext;
        this.sessionContext.init();
        this.sessionContext.resolveJSONReferences();
        protocol = Thymol.prototype.override("thProtocol", this.protocol);
        debug = Thymol.prototype.override("thDebug", debug);
        root = Thymol.prototype.override("thRoot", this.root);
        path = Thymol.prototype.override("thPath", this.path);
        allowNullText = Thymol.prototype.override("thAllowNullText", this.allowNullText);
        locale = Thymol.prototype.override("thLocale", this.locale);
        if (!(typeof thMappings === "undefined")) {
            mappings = [];
            $(thMappings).each(function() {
                mappings.push([ this[0], this[1] ]);
            });
            mappings.sort(function(a, b) {
                return a[0].length > b[0].length ? -1 : 1;
            });
        }
        if (!(typeof thMessages === "undefined")) {
            messages = new Object();
            $(thMessages).each(function() {
                messages[this[0]] = this[1];
            });
        }
        if (!(typeof thDisable === "undefined")) {
            for (j = 0, jLimit = thDisable.length; j < jLimit; j++) {
                Thymol.prototype.doDisable(thDisable[j]);
            }
        }
        base = new ThNode(document, false, null, null, null, document.nodeName, "::", false, document);
        Thymol.prototype.process(base);
        postExecute();
        return;
    }
    function getCtx() {
        return thExpressionObjects["#ctx"];
    }
    function configureModule(module) {
        if (typeof thExpressionObjects === "undefined" || thExpressionObjects === null) {
            thExpressionObjects = {};
        }
        thExpressionObjects[module.thExpressionObjectName] = module;
    }
    function configureProcessor(prefix, suffix, func, prec) {
        var p = prefix;
        if (p !== null) {
            if (thThymeleafPrefixList.indexOf(p) < 0) {
                thThymeleafPrefixList.push(p);
            }
        } else {
            usingNullPrefix = true;
        }
        p = new ThAttr(suffix, func, prec, thThymeleafAttrList, prefix);
        thThymeleafAttrList.sort(precedenceOrder);
    }
    function configurePreExecution(func) {
        if (typeof thPreExecutionFunctions === "undefined" || thPreExecutionFunctions === null) {
            thPreExecutionFunctions = [];
        }
        thPreExecutionFunctions.push(func);
    }
    function configurePostExecution(func) {
        if (typeof thPostExecutionFunctions === "undefined" || thPostExecutionFunctions === null) {
            thPostExecutionFunctions = [];
        }
        thPostExecutionFunctions.push(func);
    }
    function preExecute(context) {
        while (thPreExecutionFunctions.length > 0) {
            var func = thPreExecutionFunctions.pop();
            func();
            context.resolveJSONReferences();
        }
    }
    function postExecute() {
        while (thPostExecutionFunctions.length > 0) {
            var func = thPostExecutionFunctions.pop();
            func();
        }
    }
    function getExpression(expr, element) {
        return Thymol.prototype.resolveExpression(expr, element);
    }
    function getBooleanValue(param) {
        var flag = false, val, args;
        if (param != null) {
            if (typeof param === "boolean") {
                flag = param;
            } else if (typeof param === "number") {
                flag = param != 0;
            } else {
                val = param;
                if (Object.prototype.toString.call(val) === "[object Array]") {
                    if (val.length === 1) {
                        val = val[0];
                    } else {
                        val = true;
                    }
                }
                if (typeof val === "boolean") {
                    flag = val;
                } else if (typeof val === "number") {
                    flag = val != 0;
                } else if (typeof val === "string") {
                    args = val.match(nonURLExpr);
                    if (args) {
                        val = args[1];
                        flag = this.testParam(val);
                    } else {
                        flag = !ThUtils.testLiteralFalse(val);
                    }
                } else if (val instanceof ThParam) {
                    flag = val.getBooleanValue();
                } else {
                    flag = typeof val !== "undefined" && val !== null;
                }
            }
        }
        return flag;
    }
    function isFragmentChild(element) {
        var result = false, parent = element.parentElement;
        while (parent) {
            if (parent.getAttribute(thFragment.name) || parent.getAttribute(thFragment.synonym)) {
                result = true;
                break;
            }
            parent = parent.parentElement;
        }
        return result;
    }
    function getMessage(varName, parameters, returnStringAlways) {
        var msgKey = messages[varName];
        if (msgKey) {
            return ThUtils.renderMessage(msgKey, parameters);
        } else if (returnStringAlways !== undefined && returnStringAlways) {
            return "??" + varName + "_" + locale + "??";
        }
        return null;
    }
    function getLocale() {
        return locale;
    }
    Thymol.prototype = {
        process: function(rootNode) {
            var n = rootNode;
            try {
                while (n.thDoc) {
                    this.getChildren(n);
                    if (n.firstChild && n.firstChild.thDoc && !n.visited) {
                        n.visited = true;
                        n = n.firstChild;
                    } else {
                        if (n.element != n.thDoc) {
                            this.doReplace(n.isNode, n.element, n.thDoc);
                            if (!n.isNode) {
                                n.thDoc = n.element;
                            }
                        }
                        if (n.nextSibling && n.nextSibling.thDoc) {
                            n = n.nextSibling;
                        } else {
                            if (n == rootNode) {
                                break;
                            }
                            n = n.parentDoc;
                        }
                    }
                }
                this.processChildren(rootNode);
            } catch (err) {
                if (debug) {
                    if (err instanceof ThError) {
                        if (!err.suppress) {
                            window.alert(err);
                        }
                    } else {
                        window.alert(err);
                    }
                }
            }
        },
        getChildren: function(rootNode) {
            var count = 0, last = null, changed = false, child, froot, fstar, fchildren, i, iLimit, j, jLimit, element, theAttr;
            if (!rootNode.visited) {
                this.processComments(rootNode);
                froot = $(rootNode.thDoc);
                fstar = $(froot).add(froot.find("*"));
                fchildren = fstar.filter(thInclude.escpName).add(fstar.filter(thInclude.escpSynonym)).add(fstar.filter(thReplace.escpName)).add(fstar.filter(thReplace.escpSynonym)).add(fstar.filter(thSubstituteby.escpName)).add(fstar.filter(thSubstituteby.escpSynonym));
                for (i = 0, iLimit = fchildren.length; i < iLimit; i++) {
                    element = fchildren[i], matches = [];
                    for (j = 0, jLimit = element.attributes.length; j < jLimit; j++) {
                        theAttr = element.attributes[j];
                        if (thInclude.name == theAttr.name || thInclude.synonym == theAttr.name || thReplace.name == theAttr.name || thReplace.synonym == theAttr.name || thSubstituteby.name == theAttr.name || thSubstituteby.synonym == theAttr.name) {
                            matches.push(theAttr);
                        }
                    }
                    for (j = 0, jLimit = matches.length; j < jLimit; j++) {
                        child = this.processImport(element, rootNode, matches[j]);
                        if (child != null) {
                            changed = true;
                            if (count == 0) {
                                rootNode.firstChild = child;
                            } else {
                                last.nextSibling = child;
                            }
                            last = child;
                            count++;
                        }
                    }
                }
            }
            return changed;
        },
        processChildren: function(rootNode) {
            var i, iLimit, j, jLimit, k, kLimit, froot, fstar, allTags;
            froot = $(rootNode.thDoc);
            fstar = $(froot).children();
            for (i = 0, iLimit = fstar.length; i < iLimit; i++) {
                if (fstar[i].localName == thBlock.name || fstar[i].localName == thBlockSynonym) {
                    this.markBlock(fstar[i]);
                }
            }
            var elements = rootNode.thDoc.getElementsByTagName("*");
            for (k = 0, kLimit = elements.length; k < kLimit; k++) {
                var element = elements[k];
                var allAttributes = element.attributes;
                if (allAttributes && allAttributes.length > 0) {
                    var attributes = [];
                    if (!usingNullPrefix) {
                        for (i = 0, iLimit = allAttributes.length; i < iLimit; i++) {
                            if (allAttributes[i]) {
                                for (j = 0, jLimit = thThymeleafPrefixList.length; j < jLimit; j++) {
                                    var attrName = allAttributes[i].name.toString();
                                    if (attrName.length > thThymeleafPrefixList[j].length) {
                                        attrName = attrName.substring(0, thThymeleafPrefixList[j].length);
                                        if (attrName === thThymeleafPrefixList[j]) {
                                            attributes.push(allAttributes[i]);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        attributes = allAttributes;
                    }
                    if (attributes.length > 0) {
                        var updated = false;
                        for (j = 0, jLimit = thThymeleafAttrList.length; j < jLimit; j++) {
                            for (i = 0, iLimit = attributes.length; i < iLimit; i++) {
                                if (attributes[i].name === thThymeleafAttrList[j].name || attributes[i].name === thThymeleafAttrList[j].synonym) {
                                    var exp = ThUtils.processElement(thThymeleafAttrList[j].process, element, attributes[i], thThymeleafAttrList[j], 1);
                                    updated = exp || updated;
                                }
                            }
                        }
                        if (updated) {
                            elements = rootNode.thDoc.getElementsByTagName("*");
                            if (elements.length < kLimit) {
                                k--;
                            }
                            kLimit = elements.length;
                        }
                    }
                }
            }
            allTags = froot.find("*");
            allTags.getThDecorated(thRemove);
            allTags = froot.find("*");
            for (i = 0, iLimit = allTags.length; i < iLimit; i++) {
                if (allTags[i].localName == thBlock.name || allTags[i].localName == thBlockSynonym) {
                    this.doRemoveTag(allTags[i]);
                }
            }
        },
        markBlock: function(element) {
            var i, limit = element.childNodes.length;
            for (i = 0; i < limit; i++) {
                if (element.childNodes[i].nodeType === 1) {
                    element.childNodes[i].isBlockChild = true;
                }
            }
        },
        override: function(paramName, paramValue) {
            var param = paramValue, thv;
            thv = thymol.applicationContext[paramName];
            if (thv instanceof ThParam) {
                param = thv.value;
            } else {
                param = thv;
            }
            thv = thymol.requestContext[paramName];
            if (thv) {
                if (thv instanceof ThParam) {
                    param = thv.value;
                } else {
                    param = thv;
                }
            }
            return param;
        },
        doDisable: function(attrName) {
            var tha = this.getThAttrByName(thThymeleafAttrList, attrName);
            if (tha !== null) {
                tha.disable();
            } else {
                if (debug) {
                    window.alert('cannot disable unknown attribute "' + attrName + '"');
                }
            }
        },
        getThAttrByName: function(attrList, name) {
            var i, iLimit = attrList.length;
            for (i = 0; i < iLimit; i++) {
                if (name === attrList[i].suffix) {
                    return attrList[i];
                }
            }
            return null;
        },
        processEach: function(element, thUrlAttr, junk) {
            var elementsUpdated = false, initial = thUrlAttr.value.trim(), colonPos, varName, varNames, statVarName, expr, root, node, i, iLimit, tho, stat, count, newNode, next;
            colonPos = initial.indexOf(":");
            if (colonPos > 0) {
                varName = initial.substring(0, colonPos);
                if (varName) {
                    varName = varName.trim();
                    varNames = varName.split(",");
                    varName = varNames[0].trim();
                    if (varNames.length > 1) {
                        statVarName = varNames[1].trim();
                    } else {
                        statVarName = varName + "Stat";
                    }
                    expr = initial.substr(colonPos + 1);
                    if (expr) {
                        expr = expr.trim();
                        expr = this.resolveExpression(expr, element);
                        if (expr instanceof ThSet) {
                            expr = expr.toArray();
                        }
                        root = element.parentNode;
                        if (expr && expr instanceof Object && expr.length > 0) {
                            node = element;
                            iLimit = expr.length;
                            element.removeAttribute(thUrlAttr.name);
                            for (i = 0; i < iLimit; i++) {
                                tho = expr[i];
                                stat = new Object();
                                stat.current = tho;
                                stat.size = expr.length;
                                stat.index = i;
                                count = i + 1;
                                stat.count = count;
                                if (i == 0) {
                                    stat.first = true;
                                } else {
                                    stat.first = false;
                                }
                                if (i == expr.length - 1) {
                                    stat.last = true;
                                } else {
                                    stat.last = false;
                                }
                                if (i % 2) {
                                    stat.odd = true;
                                    stat.even = false;
                                } else {
                                    stat.odd = false;
                                    stat.even = true;
                                }
                                if (!node.thLocalVars) {
                                    node.thLocalVars = {};
                                }
                                node.thLocalVars[varName] = tho;
                                node.thLocalVars[statVarName] = stat;
                                if (count < expr.length) {
                                    newNode = element.cloneNode(true);
                                    if (node.nextElementSibling != null) {
                                        next = root.insertBefore(newNode, node.nextElementSibling);
                                    } else {
                                        next = root.appendChild(newNode);
                                    }
                                    node = next;
                                    elementsUpdated = true;
                                }
                            }
                        } else {
                            if (root !== null) {
                                if (!element.thLocalVars) {
                                    element.thLocalVars = {};
                                }
                                if (!element.thLocalVars[varName]) {
                                    element.thLocalVars[varName] = new Object();
                                }
                                if (!element.thLocalVars[statVarName]) {
                                    element.thLocalVars[statVarName] = new Object();
                                }
                                root.removeChild(element);
                                elementsUpdated = true;
                            }
                        }
                    }
                }
            }
            return elementsUpdated;
        },
        processComments: function(rootNode) {
            var comments = null, froot, fstar, changed, i, iLimit, startComment, parent, startValue, pointer, nextPointer;
            do {
                froot = $(rootNode.thDoc);
                fstar = froot.find("*");
                comments = fstar.contents().getComments();
                changed = false;
                for (i = 0, iLimit = comments.length; i < iLimit; i++) {
                    startComment = comments[i];
                    parent = startComment.parentNode;
                    startValue = startComment.nodeValue.trim();
                    if (startParserLevelCommentExpr.test(startValue)) {
                        pointer = startComment;
                        while (pointer != null) {
                            if (endParserLevelCommentExpr.test(pointer.nodeValue)) {
                                changed = parent.removeChild(pointer) != null;
                                break;
                            }
                            nextPointer = pointer.nextSibling;
                            changed = parent.removeChild(pointer) != null;
                            pointer = nextPointer;
                        }
                    } else if (startParserLevelCommentExpr2.test(startValue) && endParserLevelCommentExpr2.test(startValue)) {
                        parent.removeChild(startComment);
                        changed = true;
                    }
                }
            } while (changed);
            this.processPrototypeOnlyComments(rootNode);
        },
        processPrototypeOnlyComments: function(rootNode) {
            var comments = null, froot, fstar, changed, indexOfLast, i, iLimit, j, jLimit, k, kLimit, startComment, parent, deletions, res, fullText, innerNodes, done, next, commentText, res2, blockElement, blockDoc, blockDocBody, blockBase, newNode, newDoc;
            do {
                froot = $(rootNode.thDoc);
                fstar = froot.find("*");
                comments = fstar.contents().getComments();
                changed = false;
                indexOfLast = comments.length - 1;
                for (i = 0, iLimit = comments.length; i < iLimit; i++) {
                    startComment = comments[i];
                    parent = startComment.parentNode;
                    if (parent != null) {
                        startValue = startComment.nodeValue.trim();
                        deletions = [];
                        deletions.push(startComment);
                        startValue = startValue.replace(/\n/g, "");
                        res = startValue.match(prototypeOnlyCommentEscpExpr);
                        if (res) {
                            fullText = startValue;
                            if (parent.localName == "table" || parent.localName == "tbody") {
                                if (startValue.indexOf(thBlock.name) >= 0 || startValue.indexOf(thBlockSynonym) >= 0) {
                                    if (startValue.indexOf(endThBlockName) < 0 || startValue.indexOf(endThBlockSynonym) < 0) {
                                        fullText = fullText.replace(res[0], res[1]);
                                        innerNodes = [];
                                        done = false;
                                        next = startComment;
                                        do {
                                            next = next.nextSibling;
                                            if (next != null) {
                                                deletions.push(next);
                                                if (i < indexOfLast) {
                                                    if (next == comments[i + 1]) {
                                                        commentText = next.nodeValue;
                                                        if (commentText.indexOf(endThBlockName) >= 0 || commentText.indexOf(endThBlockSynonym) >= 0) {
                                                            res2 = commentText.match(prototypeOnlyCommentEscpExpr);
                                                            if (res2) {
                                                                commentText = commentText.replace(res2[0], res2[1]);
                                                                fullText = fullText + commentText;
                                                            }
                                                            done = true;
                                                        }
                                                    } else {
                                                        innerNodes.push(next);
                                                    }
                                                }
                                            } else {
                                                done = true;
                                            }
                                        } while (!done);
                                        blockElement = null;
                                        blockDoc = new DOMParser().parseFromString(fullText, "text/html");
                                        blockDocBody = $(blockDoc).find("body")[0];
                                        for (j = 0, jLimit = blockDocBody.childNodes.length; j < jLimit; j++) {
                                            if (blockDocBody.childNodes[j].localName == thBlock.name || blockDocBody.childNodes[j].localName == thBlockSynonym) {
                                                blockElement = blockDocBody.childNodes[j];
                                                for (k = 0, kLimit = innerNodes.length; k < kLimit; k++) {
                                                    newNode = innerNodes[k].cloneNode(true);
                                                    blockElement.appendChild(newNode);
                                                }
                                            }
                                        }
                                        if (blockElement != null) {
                                            blockBase = new ThNode(blockDoc, false, null, null, null, blockDoc.nodeName, "::", false, blockDoc);
                                            this.processChildren(blockBase);
                                            changed = this.insertUncommented(blockBase.thDoc, deletions, parent);
                                        } else {
                                            parent.removeChild(startComment);
                                            changed = true;
                                        }
                                    } else {
                                        parent.removeChild(startComment);
                                        changed = true;
                                    }
                                }
                            } else {
                                startValue = startValue.substring(3, startValue.length - 3);
                                newDoc = new DOMParser().parseFromString(startValue, "text/html");
                                changed = this.insertUncommented(newDoc, deletions, parent);
                            }
                        }
                    }
                }
            } while (changed);
        },
        insertUncommented: function(doc, deletions, parent) {
            var docBody = $(doc).find("body")[0], i, iLimit, newNode;
            for (i = 0, iLimit = docBody.childNodes.length; i < iLimit; i++) {
                newNode = docBody.childNodes[i].cloneNode(true);
                parent.insertBefore(newNode, deletions[0]);
            }
            for (i = 0, iLimit = deletions.length; i < iLimit; i++) {
                parent.removeChild(deletions[i]);
            }
            return true;
        },
        processAttr: function(element, thUrlAttr) {
            var parts = thUrlAttr.value.split(","), pos = 0, i, iLimit, pair, attrName, url, tt, existing;
            for (i = 0, iLimit = parts.length; i < iLimit; i++) {
                pair = parts[i].split("=");
                if (pair) {
                    if (thUrlAttr.name == thClassAppend.name || thUrlAttr.name == thClassAppend.synonym) {
                        pair[1] = pair[0];
                        pair[0] = "class";
                        pos = -1;
                    }
                    attrName = pair[0];
                    if (attrName) {
                        if (pair[1]) {
                            if (pos >= 0) {
                                pos = fixedValBoolAttrList.indexOf(attrName);
                            }
                            if (pos >= 0) {
                                this.doFixedValBoolAttr(pair[1], element, attrName);
                            } else {
                                url = this.getThAttribute(pair[1], element);
                                tt = typeof url;
                                if (thUrlAttr.name == thAttrAppend.name || thUrlAttr.name == thAttrAppend.synonym || thUrlAttr.name == thAttrPrepend.name || thUrlAttr.name == thAttrPrepend.synonym || thUrlAttr.name == thClassAppend.name || thUrlAttr.name == thClassAppend.synonym) {
                                    if (url !== null && (tt === "number" || tt === "string" && url.length > 0)) {
                                        existing = element.getAttribute(attrName);
                                        if (existing) {
                                            if (thUrlAttr.name == thAttrAppend.name || thUrlAttr.name == thAttrAppend.synonym) {
                                                url = existing + url;
                                            } else if (thUrlAttr.name == thClassAppend.name || thUrlAttr.name == thClassAppend.synonym) {
                                                url = existing + " " + url;
                                            } else if (thUrlAttr.name == thAttrPrepend.name || thUrlAttr.name == thAttrPrepend.synonym) {
                                                url = url + existing;
                                            }
                                        }
                                    }
                                }
                                if (url !== null && (tt === "number" || tt === "string" && url.length > 0)) {
                                    element.setAttribute(attrName, url);
                                }
                            }
                        }
                    }
                }
            }
            element.removeAttribute(thUrlAttr.name);
        },
        processInline: function(element, thUrlAttr, thAttrObj) {
            var mode = this.getThAttribute(thUrlAttr.value, element);
            if (mode == "text") {
                this.doInlineText(element);
            } else if (mode == "javascript" || mode == "dart") {
                this.doInlineJavascript(element);
            } else {
                if (debug) {
                    window.alert('thymol.processInline cannot process scripting mode: "' + mode + '" - it isn\'t supported by version "' + thVersion + '"\n');
                }
            }
            element.removeAttribute(thUrlAttr.name);
        },
        doInlineText: function(element) {
            var changed, value, i, iLimit, expr, term, result;
            for (i = 0, iLimit = element.childNodes.length; i < iLimit; i++) {
                do {
                    changed = false;
                    if (element.childNodes[i].nodeType == 1) {
                        this.doInlineText(element.childNodes[i]);
                    } else if (element.childNodes[i].nodeType == 3) {
                        value = element.childNodes[i].nodeValue;
                        if (value) {
                            expr = textInlineCommentExpr.exec(value);
                            if (expr) {
                                term = "";
                                if (expr.length > 1) {
                                    term = "[[" + expr[1] + "]]";
                                }
                                if (expr.length > 1) {
                                    result = this.getThAttribute(expr[1], element);
                                    result = value.replace(term, result);
                                    element.childNodes[i].nodeValue = result;
                                    changed = true;
                                }
                                expr = null;
                            }
                        }
                    }
                } while (changed);
            }
        },
        doInlineJavascript: function(element) {
            var changed, value, second, i, iLimit, expr, scraps, remainder, termIndx, term, secondIndx, result;
            for (i = 0, iLimit = element.childNodes.length; i < iLimit; i++) {
                do {
                    second = null;
                    changed = false;
                    value = element.childNodes[i].nodeValue;
                    if (value) {
                        expr = javascriptInlineCommentExpr.exec(value);
                        if (expr) {
                            termIndx = expr.index;
                            term = "";
                            if (expr.length > 1) {
                                term = "/*[[" + expr[1] + "]]*/";
                            }
                            termIndx = termIndx + term.length;
                            remainder = value.substring(termIndx);
                            scraps = javascriptInlineRemainderExpr.exec(remainder);
                            if (scraps) {
                                if (scraps.length > 1) {
                                    secondIndx = remainder.indexOf(scraps[1]);
                                    second = remainder.substring(secondIndx);
                                    value = value.substring(0, termIndx);
                                    value = value + second;
                                }
                            }
                            if (expr.length > 1) {
                                result = this.resolveExpression(expr[1], element);
                                if (result instanceof ThObject) {
                                    result = result.toNonThObject();
                                }
                                if (!this.isLiteral(result)) {
                                    result = this.getStringView(result);
                                }
                                result = value.replace(term, result);
                                element.childNodes[i].nodeValue = result;
                                changed = true;
                            }
                            expr = null;
                            scraps = null;
                        }
                    }
                } while (changed);
            }
        },
        getStringView: function(param) {
            var view = "", objType;
            if (typeof param === "string") {
                view = view + "'" + param + "'";
            } else if (typeof param === "number" || typeof param === "boolean") {
                view = view + param;
            } else if (typeof param === "object") {
                if (param instanceof Object) {
                    objType = Object.prototype.toString.call(param);
                    if ("[object Array]" == objType) {
                        view = this.getStringViewArray(param);
                    } else if ("[object Object]" == objType) {
                        view = this.getStringViewObject(param);
                    }
                }
            }
            return view;
        },
        getStringViewArray: function(param) {
            var view = "[", i, iLimit;
            for (i = 0, iLimit = param.length; i < iLimit; i++) {
                view = view + this.getStringView(param[i]);
                if (i < param.length - 1) {
                    view = view + ",";
                }
            }
            view = view + "]";
            return view;
        },
        getStringViewObject: function(param) {
            var view = "{", key = null;
            for (key in param) {
                if (key) {
                    if (view != "{") {
                        view = view + ",";
                    }
                    view = view + this.getStringView(key) + ":";
                    view = view + this.getStringView(param[key]);
                }
            }
            view = view + "}";
            return view;
        },
        processSpecAttrMod: function(element, thUrlAttr, thAttrObj) {
            var url = this.getThAttribute(thUrlAttr.value, element);
            element.setAttribute(thAttrObj.suffix, url);
            element.removeAttribute(thUrlAttr.name);
        },
        processFixedValBoolAttr: function(element, thUrlAttr, thAttrObj) {
            var val = this.doFixedValBoolAttr(thUrlAttr.value, element, thAttrObj.suffix);
            if (val != null) {
                element.removeAttribute(thUrlAttr.name);
            } else {
                if (debug) {
                    window.alert("thymol.processFixedValBoolAttr cannot process: " + thUrlAttr.name + '="' + thUrlAttr.value + '"\n' + element.innerHTML);
                }
            }
        },
        doFixedValBoolAttr: function(valParam, element, attr) {
            var val = this.getBoolean(valParam, element);
            if (val) {
                element.setAttribute(attr, attr);
            }
            return val;
        },
        isLiteral: function(val) {
            var first, last;
            if (typeof val === "string") {
                first = val.charAt(0);
                last = val.charAt(val.length - 1);
                if (first == "'" && last == "'") {
                    return true;
                }
                if (first == '"' && last == '"') {
                    return true;
                }
            }
            return false;
        },
        isLiteralSubst: function(param) {
            var result = false, par = param;
            if (typeof par === "string") {
                par = par.trim();
            }
            if (par) {
                if (par.charAt(0) == "|") {
                    if (par.charAt(par.length - 1) == "|") {
                        result = true;
                    }
                }
            }
            return result;
        },
        processPairedAttr: function(element, thUrlAttr) {
            var url = this.getThAttribute(thUrlAttr.value, element);
            if (url != "") {
                if (thAltTitle.name == thUrlAttr.name || thAltTitle.synonym == thUrlAttr.name) {
                    element.setAttribute("alt", url);
                    element.setAttribute("title", url);
                }
                if (thLangXmlLang.name == thUrlAttr.name || thLangXmlLang.synonym == thUrlAttr.name) {
                    element.setAttribute("lang", url);
                    element.setAttribute("xml:lang", url);
                }
                element.removeAttribute(thUrlAttr.name);
            } else {
                if (debug) {
                    window.alert("thymol.processPairedAttr cannot process: " + thUrlAttr.name + '="' + thUrlAttr.value + '"\n' + element.innerHTML);
                }
            }
        },
        processText: function(element, thUrlAttr) {
            var url = this.getThAttribute(thUrlAttr.value, element), updated = false, text, newTextNode, i, iLimit, iUpper;
            if (url == null) {
                if (!allowNullText) {
                    if (debug) {
                        window.alert("thymol.processText cannot process: " + thUrlAttr.name + '="' + thUrlAttr.value + '"\n' + element.innerHTML);
                    }
                    return updated;
                }
                url = "";
            } else {
                if (url instanceof ThParam || url instanceof ThObject) {
                    if (url.value) {
                        url = url.value;
                    }
                }
            }
            try {
                while (element.firstChild != null) {
                    element.removeChild(element.firstChild);
                    updated = true;
                    if (element.firstChild == null) {
                        break;
                    }
                }
                if (thText.name == thUrlAttr.name || thText.synonym == thUrlAttr.name) {
                    if (Object.prototype.toString.call(url) === "[object Array]") {
                        text = "[";
                        for (i = 0, iLimit = url.length, iUpper = url.length - 1; i < iLimit; i++) {
                            text += url[i].toString();
                            if (i < iUpper) {
                                text += ", ";
                            }
                        }
                        text += "]";
                    } else {
                        text = url.toString();
                    }
                    text = this.unescape(text);
                    newTextNode = document.createTextNode(text);
                    element.appendChild(newTextNode);
                    updated = true;
                }
                if (thUtext.name == thUrlAttr.name || thUtext.synonym == thUrlAttr.name) {
                    element.innerHTML = url;
                }
                element.removeAttribute(thUrlAttr.name);
            } catch (err) {
                if (debug) {
                    window.alert("text replace error");
                }
            }
            return updated;
        },
        unescape: function(text) {
            var result = text, i, iLimit, iUpper, c, cc;
            if (text !== null && typeof text !== "undefined") {
                result = "";
                iLimit = text.length;
                iUpper = iLimit - 3;
                for (i = 0; i < iLimit; i++) {
                    c = text.charAt(i);
                    if (i < iUpper) {
                        if (c === "&") {
                            cc = text.charAt(i + 1).toLowerCase();
                            if ((cc === "g" || cc === "l") && text.charAt(i + 2).toLowerCase() === "t" && text.charAt(i + 3) === ";") {
                                i += 3;
                                if (cc === "g") {
                                    c = ">";
                                } else {
                                    c = "<";
                                }
                            } else if (i < iUpper - 1 && cc === "a" && text.charAt(i + 2).toLowerCase() === "m" && text.charAt(i + 3).toLowerCase() === "p" && text.charAt(i + 4) === ";") {
                                i += 4;
                            } else if (i < iUpper - 2) {
                                if (cc === "q" && text.charAt(i + 2).toLowerCase() === "u" && text.charAt(i + 3).toLowerCase() === "o" && text.charAt(i + 4).toLowerCase() === "t" && text.charAt(i + 5) === ";") {
                                    i += 5;
                                    c = '"';
                                } else if (cc === "a" && text.charAt(i + 2).toLowerCase() === "p" && text.charAt(i + 3).toLowerCase() === "o" && text.charAt(i + 4).toLowerCase() === "s" && text.charAt(i + 5) === ";") {
                                    i += 5;
                                    c = "'";
                                }
                            }
                        }
                    }
                    result += c;
                }
            }
            return result;
        },
        processObject: function(element, thUrlAttr) {
            var argValue = thUrlAttr.value.trim(), val;
            if (argValue) {
                val = this.resolveExpression(argValue, element);
                if (val) {
                    element.thObjectVar = val;
                }
            }
            element.removeAttribute(thUrlAttr.name);
        },
        processWith: function(element, thUrlAttr) {
            this.doWith(element, thUrlAttr.value);
            element.removeAttribute(thUrlAttr.name);
        },
        doWith: function(element, content) {
            var argValue = content.trim(), argCount = 0, i, iLimit, assigs, term, pair, varName, varVal, localVar, val;
            if (argValue) {
                assigs = argValue.split(",");
                for (i = 0, iLimit = assigs.length; i < iLimit; i++) {
                    term = assigs[i];
                    if (term) {
                        pair = term.split("=");
                        if (pair) {
                            varName = pair[0].trim();
                            if (varName) {
                                argCount++;
                                varVal = pair[1].trim();
                                if (varVal) {
                                    localVar = null;
                                    val = this.resolveExpression(varVal, element);
                                    if (val != null) {
                                        localVar = val;
                                    } else {
                                        varVal = ThUtils.unQuote(varVal);
                                        localVar = varVal;
                                    }
                                    if (!element.thLocalVars) {
                                        element.thLocalVars = {};
                                    }
                                    element.thLocalVars[varName] = localVar;
                                }
                            }
                        }
                    }
                }
            }
            return argCount;
        },
        doList: function(element, content) {
            var argValue = content.trim(), argsCount = 0, argsList = [], assigs, i, iLimit, val;
            if (argValue) {
                assigs = argValue.split(",");
                for (i = 0, iLimit = assigs.length; i < iLimit; i++) {
                    val = this.resolveExpression(assigs[i], element);
                    argsList[i] = val;
                }
                if (!element.thLocalVars) {
                    element.thLocalVars = {};
                }
                element.thLocalVars["..."] = argsList;
                argsCount = argsList.length;
            }
            return argsCount;
        },
        processRemove: function(element, thUrlAttr) {
            var locals = element.thLocalVars, savedLocals = element.thLocalVars, arg, nodes, first;
            if (!locals) {
                locals = {};
            }
            if (!locals["tag"]) {
                locals["tag"] = "tag";
            }
            if (!locals["body"]) {
                locals["body"] = "body";
            }
            if (!locals["none"]) {
                locals["none"] = "none";
            }
            if (!locals["all"]) {
                locals["all"] = "all";
            }
            if (!locals["all-but-first"]) {
                locals["all-but-first"] = "all-but-first";
            }
            element.thLocalVars = locals;
            arg = this.getThAttribute(thUrlAttr.value, element);
            if ("all" == arg) {
                if (element.parentNode != null) {
                    element.parentNode.removeChild(element);
                }
            } else if ("body" == arg) {
                element.innerHTML = "";
            } else if ("tag" == arg) {
                this.doRemoveTag(element);
            } else if ("all-but-first" == arg) {
                nodes = element.childNodes;
                first = true;
                $(nodes).each(function() {
                    if (this.nodeType == 1) {
                        if (!first) {
                            element.removeChild(this);
                        }
                        first = false;
                    }
                });
            } else if ("none" == arg || null == arg) {}
            element.thLocalVars = savedLocals;
            element.removeAttribute(thUrlAttr.name);
        },
        processAssert: function(element, thUrlAttr) {
            var argValue = thUrlAttr.value.trim(), result = true, term = "", terms, i, iLimit, expr, val, flag;
            if (argValue) {
                terms = argValue.split(",");
                for (i = 0, iLimit = terms.length; i < iLimit; i++) {
                    term = terms[i];
                    expr = ThUtils.unParenthesise(term);
                    if (expr != null) {
                        val = this.resolveExpression(expr, element);
                        if (val) {
                            flag = this.getBoolean(val, element);
                            if (!flag) {
                                result = false;
                                break;
                            }
                        } else {
                            result = false;
                            break;
                        }
                    } else {
                        result = false;
                        break;
                    }
                }
            }
            if (!result) {
                if (argValue != term) {
                    argValue = " list is: " + argValue;
                } else {
                    argValue = "";
                }
                if (term != "") {
                    term = ' false term is: "' + term + '"';
                }
                if (debug) {
                    window.alert("thymol.processAssert assertion failure -" + argValue + term + "\n");
                }
            }
            element.removeAttribute(thUrlAttr.name);
        },
        doRemoveTag: function(element) {
            var i, iLimit;
            if (element.parentNode) {
                for (i = 0, iLimit = element.childNodes.length; i < iLimit; i++) {
                    element.parentNode.insertBefore(element.childNodes[i].cloneNode(true), element);
                }
                element.parentNode.removeChild(element);
            }
        },
        processConditional: function(element, attr) {
            var removed = false;
            if (attr.value) {
                removed = this.doIfOrUnless(element, attr.value, thIf.name == attr.name || thIf.synonym == attr.name);
            }
            element.removeAttribute(attr.name);
            return removed;
        },
        doIfOrUnless: function(element, value, isIf) {
            var processed = false, flag;
            if (value) {
                flag = this.getBoolean(value, element);
                processed = true;
                if (!flag) {
                    if (isIf) {
                        element.parentNode.removeChild(element);
                        return true;
                    }
                } else {
                    if (!isIf) {
                        element.parentNode.removeChild(element);
                        return true;
                    }
                }
            }
            if (!processed && debug) {
                window.alert("thymol.processConditional cannot process conditional: " + value + "\n" + element.innerHTML);
            }
            return false;
        },
        getBoolean: function(param, element) {
            if (param == null) {
                return false;
            }
            if (typeof param === "boolean") {
                return param;
            } else if (typeof param === "number") {
                return param != 0;
            }
            var initial = ThUtils.unParenthesise(param), negate = false, val, args, flag;
            if (initial.charAt(0) == "!") {
                negate = true;
                initial = initial.substring(1, initial.length);
                initial = ThUtils.unParenthesise(initial);
            }
            val = this.getThAttribute(initial, element);
            if (val == null) {
                args = initial.match(varExpr);
                if (args) {
                    if (args[1].charAt(0) == "!") {
                        negate = !negate;
                    }
                }
            }
            flag = getBooleanValue(val);
            if (negate) {
                flag = !flag;
            }
            return flag;
        },
        testParam: function(param) {
            var initial = param, result = false, theParam = null, negate = false;
            if (typeof initial === "boolean") {
                result = initial;
            } else {
                theParam = null;
                negate = false;
                if (typeof initial === "object" && initial instanceof ThParam) {
                    theParam = initial;
                } else {
                    initial = initial.valueOf();
                    if (initial.charAt(0) == "!") {
                        negate = true;
                        initial = initial.substring(1);
                    }
                }
                theParam = thymol.applicationContext[initial];
                if (theParam != null) {
                    result = theParam.getBooleanValue();
                }
                if (negate) {
                    result = !result;
                }
            }
            return result ? true : false;
        },
        processSwitch: function(element, attr) {
            var val = ThUtils.unParenthesise(attr.value), updated = false, args, matched = false, thCaseSpecs, caseClause, remove, ccAttr;
            val = this.getThAttribute(val, element);
            if (typeof val === "string") {
                args = val.match(nonURLExpr);
                if (args) {
                    val = args[1];
                }
            }
            val = ThUtils.unQuote(val);
            thCaseSpecs = $(thCase.escpName, element);
            thCaseSpecs.each(function() {
                caseClause = this;
                remove = true;
                $(caseClause.attributes).each(function() {
                    ccAttr = this;
                    if (thCase.name == ccAttr.name || thCase.synonym == ccAttr.name) {
                        if (!matched) {
                            matched = Thymol.prototype.processCase(element, ccAttr, val);
                            if (matched) {
                                remove = false;
                            }
                        }
                        caseClause.removeAttribute(ccAttr.name);
                    }
                });
                if (remove) {
                    element.removeChild(caseClause);
                    updated = true;
                }
            });
            return updated;
        },
        processCase: function(element, attr, param) {
            var val = this.substitute(attr.value, element);
            val = ThUtils.unQuote(val);
            if (val == "*" || param && param == val) {
                return true;
            }
            return false;
        },
        processImport: function(element, rootNode, attr) {
            var importNode = null, filePart, fragmentPart, names, parts, fragmentArgsList, isNode, fragment, fileName, content;
            if (!isFragmentChild(element)) {
                filePart = null;
                fragmentPart = "::";
                if (attr.value.indexOf("::") < 0) {
                    filePart = this.getFilePart(attr.value, element);
                } else {
                    names = attr.value.split("::");
                    filePart = this.getFilePart(names[0].trim(), element);
                    fragmentPart = names[1].trim();
                }
                if ("this" == filePart) {
                    filePart = "";
                }
                if (filePart != null) {
                    parts = filePart.match(varParExpr);
                    fragmentArgsList = null;
                    if (parts) {
                        if (parts.length > 1) {
                            filePart = parts[1].trim();
                        }
                        if (parts.length > 2) {
                            fragmentArgsList = parts[2].trim();
                        }
                    }
                    isNode = thReplace.name == attr.localName || thReplace.synonym == attr.localName || thSubstituteby.name == attr.localName || thSubstituteby.synonym == attr.localName;
                    if (thCache[filePart] != null && thCache[filePart][fragmentPart] != null) {
                        isNode = isNode || fragmentPart == "::";
                        importNode = new ThNode(thCache[filePart][fragmentPart], false, rootNode, null, null, filePart, fragmentPart, isNode, element);
                    } else {
                        fragment = null;
                        if (filePart != "") {
                            fileName = filePart + ".html";
                            $.get(fileName, function(textContent, status) {
                                if ("success" == status) {
                                    content = new DOMParser().parseFromString(textContent, "text/html");
                                    fragment = Thymol.prototype.getImportNode(element, filePart, fragmentPart, fragmentArgsList, content);
                                } else if (debug) {
                                    window.alert("thymol.processImport file read failed: " + filePart + " fragment: " + fragmentPart);
                                }
                            }, "text");
                        } else {
                            fragment = this.getImportNode(element, filePart, fragmentPart, fragmentArgsList, document);
                        }
                        if (fragment == null) {
                            if (debug) {
                                window.alert("thymol.processImport fragment import failed: " + filePart + " fragment: " + fragmentPart);
                            }
                        } else {
                            importNode = new ThNode(fragment, false, rootNode, null, null, filePart, fragmentPart, isNode, element);
                        }
                    }
                }
                element.removeAttribute(attr.name);
            }
            return importNode;
        },
        getImportNode: function(element, filePart, fragmentArg, fragmentArgsList, content) {
            var result = null, fragmentName = fragmentArg.trim(), fragmentPart = fragmentName, parts, argsCount, matched, fragment, htmlContent, fragArray, i, iLimit, j, jLimit, k, clean, bare, vlParts, vlArgs, argsList, varName, newElement;
            fragmentName = fragmentName.replace(/text\(\)/g, textFuncSynonym);
            parts = fragmentName.match(varParExpr);
            if (parts == null && fragmentArgsList != null) {
                parts = [];
                parts[1] = fragmentName;
                parts[2] = fragmentArgsList;
            }
            argsCount = 0;
            if (parts) {
                if (parts.length > 1) {
                    fragmentName = parts[1].trim();
                    if (parts.length > 2) {
                        if (parts[2].indexOf("=") > 0) {
                            argsCount = this.doWith(element, parts[2]);
                        } else {
                            argsCount = this.doList(element, parts[2]);
                        }
                    }
                }
            }
            if (thCache[filePart] == null) {
                thCache[filePart] = new Object();
            }
            matched = false;
            fragment = null;
            if (fragmentName == "::") {
                htmlContent = $("html", content)[0];
                result = htmlContent;
                matched = true;
            } else {
                fragArray = $(thFragment.escpName, content);
                for (i = 0, iLimit = fragArray.length; i < iLimit; i++) {
                    fragment = fragArray[i];
                    for (j = 0, jLimit = fragment.attributes.length; j < jLimit; j++) {
                        clean = fragment.attributes[j];
                        clean = clean.value.replace(/\s/g, "");
                        bare = null;
                        vlParts = clean.match(varParExpr);
                        if (vlParts) {
                            if (vlParts.length > 1) {
                                bare = vlParts[1].trim();
                            }
                        }
                        if (fragmentName == bare && argsCount > 0) {
                            if (vlParts.length > 2) {
                                vlArgs = vlParts[2].trim().split(",");
                                if (vlArgs) {
                                    if (vlArgs.length == argsCount) {
                                        argsList = element.thLocalVars["..."];
                                        if (argsList != null) {
                                            for (k = 0; k < argsCount; k++) {
                                                varName = vlArgs[k].trim();
                                                element.thLocalVars[varName] = argsList[k];
                                            }
                                            element.thLocalVars["..."] = null;
                                        }
                                        matched = true;
                                        break;
                                    } else if (vlArgs.length > argsCount) {
                                        break;
                                    }
                                }
                            }
                        }
                        if (fragmentName == clean || fragmentPart == clean || fragmentName == bare) {
                            matched = true;
                            break;
                        }
                    }
                    if (matched) {
                        result = fragment;
                        break;
                    }
                }
            }
            if (!matched) {
                fragment = this.getDOMSelection(fragmentName, content);
                if (fragment) {
                    matched = true;
                    result = fragment;
                } else {
                    if (!element.isBlockChild) {
                        throw new ThError('getImportNode cannot match fragment: "' + fragmentName + '"', element);
                    }
                }
            }
            thCache[filePart][fragmentPart] = result;
            if (matched) {
                newElement = result.cloneNode(true);
                if (newElement.nodeType == 1) {
                    newElement.removeAttribute(thFragment.name);
                    newElement.removeAttribute(thFragment.synonym);
                }
                result = newElement;
                result.thLocalVars = element.thLocalVars;
            }
            return result;
        },
        getDOMSelection: function(initial, content) {
            var spec = initial, result = null, scope = "", query = new Array(), parts = "", innr = ThUtils.unBracket(spec), i, iLimit, j, jLimit, k, kLimit, m, mLimit, token, indx, saved, indxed, start, selection, descend, subQuery, exprFrags, classSpecs, qTerms, subSelect, partial, html, newNode;
            if (spec != innr && innr.charAt(innr.length - 1) == "]") {
                spec = innr;
            }
            while (spec != "") {
                parts = spec.match(domSelectExpr);
                if (parts != null && parts.length > 1) {
                    for (i = 1, iLimit = parts.length; i < iLimit; i++) {
                        if (parts[i] != null) {
                            token = parts[i];
                            indx = null;
                            innr = ThUtils.unBracket(token);
                            if (token != innr) {
                                if (innr.match(numericExpr)) {
                                    indx = innr;
                                }
                            }
                            saved = spec;
                            spec = spec.replace(token, "");
                            if (saved == spec) {
                                spec = "";
                            }
                            if (indx) {
                                token = query[query.length - 1];
                                indxed = new String(token);
                                indxed.indx = indx;
                                query[query.length - 1] = indxed;
                            } else {
                                query.push(token.trim());
                            }
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
            start = 0;
            if (query.length > 0 && query[0] != "" && query[0].charAt(0) == "/") {
                scope = query[0];
                start = 1;
            }
            selection = [];
            selection.push(content);
            descend = false;
            for (i = start, iLimit = query.length; i < iLimit; i++) {
                subQuery = query[i];
                innr = ThUtils.unBracket(subQuery);
                if (subQuery != innr) {
                    innr = innr.replace(/[']/g, '"');
                    subQuery = "";
                    exprFrags = innr.split(/\s{1}\s*((?:and)|(?:or))\s{1}\s*/);
                    for (j = 0, jLimit = exprFrags.length; j < jLimit; j++) {
                        if (exprFrags[j] != "and" && exprFrags[j] != "or") {
                            classSpecs = exprFrags[j].match(/[@]?\s*(?:class)\s*(\W?[=])\s*[\"]((?:\w*[\-_]*)*)[\"]/);
                            if (classSpecs && classSpecs.length > 0) {
                                if (classSpecs[1] == "=") {
                                    subQuery = subQuery + "[class~='" + classSpecs[2] + "']";
                                }
                                if (classSpecs[1] == "^=") {
                                    subQuery = subQuery + "[class^='" + classSpecs[2] + "'],[class*=' " + classSpecs[2] + "']";
                                }
                            } else {
                                subQuery = subQuery + "[" + exprFrags[j] + "]";
                            }
                        } else if (exprFrags[j] == "or") {
                            subQuery = subQuery + ",";
                        }
                    }
                }
                qTerms = subQuery.split("/");
                for (j = 0, jLimit = qTerms.length; j < jLimit; j++) {
                    if (qTerms[j] != "") {
                        qTerms[j] = qTerms[j].replace(/[@]/g, "");
                        if (subQuery.indx != null) {
                            qTerms[j] = qTerms[j] + ":eq(" + subQuery.indx + ")";
                        }
                        subSelect = [];
                        for (k = 0, kLimit = selection.length; k < kLimit; k++) {
                            partial = null;
                            if (qTerms[j] == textFuncSynonym) {
                                partial = $(selection[k]).contents().filter(function() {
                                    return this.nodeType === 3;
                                });
                            } else if (descend) {
                                partial = $(selection[k]).children(qTerms[j]);
                            } else if (j == 0) {
                                if (scope == "/") {
                                    html = $("html", selection[k]);
                                    if (html.length > 0) {
                                        selection[k] = html;
                                    }
                                    partial = $(selection[k]).children("body").children(qTerms[j]);
                                    scope = "";
                                } else {
                                    if (i == 0 || scope == "//") {
                                        partial = $(selection[k]).find(qTerms[j]);
                                        scope = "";
                                    } else {
                                        partial = $(selection[k]).filter(qTerms[j]);
                                    }
                                }
                            } else {
                                partial = $(selection[k]).children(qTerms[j]);
                            }
                            if (partial != null) {
                                for (m = 0, mLimit = partial.length; m < mLimit; m++) {
                                    subSelect.push(partial[m]);
                                }
                            }
                        }
                        selection = subSelect;
                    }
                }
                descend = qTerms[qTerms.length - 1] == "";
            }
            result = selection;
            if (result != null && !(result.length === undefined)) {
                if (result.length > 1) {
                    newNode = document.createDocumentFragment();
                    for (i = 0, iLimit = result.length; i < iLimit; i++) {
                        newNode.appendChild(result[i]);
                    }
                    result = newNode;
                } else {
                    result = result[0];
                }
            }
            return result;
        },
        getFilePart: function(part, element) {
            var result = this.substitute(part, element), mapped = null, slashpos;
            if (result) {
                if (mappings) {
                    mapped = this.getMapped(result, false);
                }
            }
            if (mapped) {
                result = protocol + mapped;
            } else {
                if (result && result.charAt(0) != ".") {
                    slashpos = result.indexOf("/");
                    if (slashpos >= 0) {
                        if (slashpos == 0) {
                            result = result.substring(1);
                        }
                        result = protocol + root + path + result;
                    }
                }
            }
            return result;
        },
        getThAttribute: function(part, element) {
            var result = ThUtils.unParenthesise(part);
            result = this.doExpression(result, element);
            if (Object.prototype.toString.call(result) === "[object Array]") {
                if (result.length === 1) {
                    result = result[0];
                }
            }
            if (result instanceof ThParam) {
                result = result.value;
            }
            return result;
        },
        doExpression: function(part, element) {
            var result = ThUtils.unParenthesise(part), isLink = false, argsList = null, args = part.match(linkExpr), expr, unq, token, mapped, commaSplit, eqSplit, i, iLimit, rhs;
            if (args) {
                if (args[1]) {
                    isLink = true;
                    result = args[1].trim();
                    if (args[2]) {
                        argsList = ThUtils.unParenthesise(args[2].trim());
                    }
                }
            }
            expr = null;
            unq = ThUtils.unQuote(result);
            if (unq != result) {
                result = this.preProcess(unq, element);
            } else {
                if (literalTokenExpr.test(result)) {
                    token = thymol.booleanAndNullTokens[result];
                    if (!(typeof token === "undefined")) {
                        result = token;
                    } else {
                        if (result.match(numericExpr)) {
                            result = ThUtils.getToPrecision(result, ThUtils.getDecimalDigits(result));
                        } else {
                            expr = this.resolveExpression(result, element);
                            if (expr !== undefined && expr !== null && !(expr != expr)) {
                                result = expr;
                            }
                        }
                    }
                } else {
                    if (!(result.charAt(0) == "/")) {
                        expr = this.resolveExpression(result, element);
                        if (expr !== null && !(expr != expr)) {
                            result = expr;
                        } else {
                            result = null;
                        }
                    }
                }
            }
            mapped = this.getMapped(result, true);
            if (mapped) {
                result = this.getWithProtocol(mapped);
            }
            if (isLink) {
                if (result == null) {
                    result = "";
                } else {
                    result = result.toString().trim();
                }
                if (!/.*:\/\/.*/.test(result)) {
                    if (/^~?\/.*$/.test(result)) {
                        if (/^~.*$/.test(result)) {
                            result = result.substring(1);
                        }
                        if (/^\/\/.*$/.test(result)) {
                            result = this.getWithProtocol(result);
                        } else {
                            result = this.getWithProtocol(root + result.substring(1));
                        }
                    }
                }
                if (argsList) {
                    commaSplit = argsList.split(",");
                    for (i = 0, iLimit = commaSplit.length; i < iLimit; i++) {
                        eqSplit = commaSplit[i].split("=");
                        if (i == 0) {
                            result = result + "?" + eqSplit[0];
                        } else {
                            result = result + "&" + eqSplit[0];
                        }
                        if (eqSplit.length > 1 && eqSplit[1]) {
                            rhs = this.resolveExpression(eqSplit[1], element);
                            if (rhs != null) {
                                result = result + "=" + encodeURIComponent(rhs);
                            }
                        }
                    }
                }
            }
            return result;
        },
        getMapped: function(uri, extended) {
            var mapped = null, i, iLimit, key;
            if (uri && typeof uri === "string") {
                if (mappings) {
                    for (i = 0, iLimit = mappings.length; i < iLimit; i++) {
                        key = mappings[i][0];
                        if (uri == key) {
                            mapped = mappings[i][1];
                            break;
                        } else if (extended) {
                            if (uri.indexOf(key) == 0) {
                                mapped = uri.substring(key.length);
                                mapped = mappings[i][1] + mapped;
                                break;
                            }
                        }
                    }
                }
            }
            return mapped;
        },
        processFragment: function(element, thUrlAttr, thAttrObj) {
            element.removeAttribute(thUrlAttr.name);
        },
        getWithProtocol: function(initial) {
            var result = initial;
            if (typeof result === "string") {
                result = result.trim();
            }
            if (!/^http:.*$/i.test(result)) {
                result = protocol + result;
            }
            return result;
        },
        substitute: function(initial, element, lenient) {
            var argValue = initial, result, args, token, re, subs, saved;
            if (typeof argValue === "string") {
                argValue = argValue.trim();
            }
            result = argValue;
            args = "";
            while (args != null) {
                args = argValue.match(/.*([$\*#@]{(!?[^}]*)}).*/);
                if (args != null && args.length > 0) {
                    if (args.length == 3) {
                        token = args[1];
                        token = token.replace(/[$]/g, "[$]").replace(/[*]/g, "[*]").replace(/[\']/g, "[']").replace(/[+]/g, "[+]").replace(/[\(]/g, "[(]").replace(/[\)]/g, "[)]");
                        re = new RegExp(token);
                        subs = this.resolveExpression(args[2], element);
                        if (subs != args[2]) {
                            result = result.replace(re, subs, "g");
                            if (result == "null") {
                                result = null;
                            }
                        } else {
                            subs = "";
                            if (debug && !lenient) {
                                window.alert('thymol variable substitution failed: "' + initial + '"');
                            }
                        }
                        saved = argValue;
                        argValue = argValue.replace(re, subs, "g");
                        if (saved == argValue) {
                            argValue = "";
                        }
                    }
                }
            }
            return result;
        },
        getParameter: function(name) {
            var result;
            result = thymol.requestContext[name];
            if (typeof result === "undefined") {
                result = thymol.sessionContext[name];
            }
            if (typeof result === "undefined") {
                result = thymol.applicationContext[name];
            }
            return result;
        },
        resolveExpression: function(argValue, element) {
            var result = argValue, subst = false, initial, shortCut, args, negate, token, lsp;
            if (typeof argValue === "string") {
                initial = argValue.trim();
                result = initial;
                if (result) {
                    shortCut = this.getParameter(result);
                    if (!shortCut) {
                        args = result.match(varExpr3);
                        if (args) {
                            if (args[1] && args[1].length > 0) {
                                shortCut = this.getParameter(args[1]);
                            }
                        }
                    }
                    if (shortCut) {
                        if (shortCut instanceof ThParam) {
                            result = shortCut.value;
                        } else {
                            result = shortCut;
                        }
                        if (typeof result === "string" && result.match(numericExpr)) {
                            result = parseInt(result);
                        }
                    } else {
                        initial = ThUtils.unParenthesise(result);
                        negate = false;
                        if (initial.charAt(0) == "!") {
                            negate = true;
                            initial = initial.substring(1, initial.length);
                            initial = ThUtils.unParenthesise(initial);
                        }
                        if (literalTokenExpr.test(initial)) {
                            token = thymol.booleanAndNullTokens[initial];
                            if (!(typeof token === "undefined")) {
                                result = token.value;
                                subst = true;
                            }
                        }
                        lsp = null;
                        if (!subst) {
                            lsp = initial.match(litSubstExpr);
                            if (lsp && lsp.length > 0) {
                                if (this.charOcurrences(lsp[1], "'") < 2) {
                                    initial = this.doLiteralSubstExpr(initial, lsp[1]);
                                }
                            }
                            result = "";
                            if (initial != "") {
                                initial = ThUtils.unParenthesise(initial);
                                initial = this.preProcess(initial, element);
                                result = this.doParseExpr(initial, element);
                            }
                        }
                        if (result == initial && typeof result == typeof initial) {
                            result = null;
                        } else if (typeof result === "string") {
                            if (!lsp) {
                                result = result.replace(/[\\][\\]/g, "\\");
                            }
                            result = result.replace(/&#39;/g, "'").replace(/&apos;/gi, "'");
                        }
                        if (negate) {
                            if (typeof result === "boolean") {
                                result = !result;
                            } else if (typeof result === "number") {
                                result = result == 0;
                            } else if (typeof result === "string") {
                                result = !ThUtils.testLiteralFalse(result);
                            }
                        }
                    }
                }
            }
            return result;
        },
        charOcurrences: function(str, chr) {
            var count = 0, i = 0, iLimit = str.length;
            for (;i < iLimit; i++) {
                if (str.charAt(i) === chr) {
                    count++;
                }
            }
            return count;
        },
        preProcess: function(expr, element) {
            var result = expr, fp, lp;
            do {
                fp = result.indexOf("__");
                if (fp >= 0) {
                    lp = -1;
                    if (result.length > 4) {
                        lp = result.lastIndexOf("__");
                    }
                    if (lp <= 0) {
                        throw new ThError("Mismatched pre-processing indicators", element);
                    }
                    var head = result.substring(0, fp);
                    var centre = result.substring(fp + 2, lp);
                    centre = this.doParseExpr(centre, element);
                    var tail = result.substring(lp + 2);
                    result = head + centre + tail;
                    fp = result.indexOf("__");
                }
            } while (fp >= 0);
            result = result.replace("\\_\\_", "__", "g");
            return result;
        },
        doParseExpr: function(initial, element) {
            var expr, result = initial;
            expr = ThParser.parse(result);
            expr = expr.simplify();
            result = expr.evaluate(element, this.substituteParam);
            if (typeof result === "number") {
                result = ThUtils.getToPrecision(result, expr.precision);
            }
            return result;
        },
        doLiteralSubstExpr: function(param, primary) {
            var result = param.trim(), term, subst, lsp;
            if (this.isLiteralSubst(result)) {
                result = this.decodeLiteralSubst(result);
            } else {
                term = primary;
                while (term != null) {
                    if (this.isLiteralSubst(term)) {
                        subst = this.decodeLiteralSubst(term);
                        result = result.replace(term, subst);
                        lsp = result.match(litSubstExpr);
                        if (lsp && lsp.length > 0) {
                            term = lsp[1];
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            return result;
        },
        decodeLiteralSubst: function(param) {
            var result = param, parts, rep, i, iLimit;
            result = result.trim();
            result = result.substring(1, result.length - 1);
            result = result.replace(/[\']/g, "&#39;");
            parts = result.split(varRefExpr);
            if (parts && parts.length > 0) {
                rep = "";
                for (i = 0, iLimit = parts.length; i < iLimit; i++) {
                    if (parts[i] != "") {
                        if (!parts[i].match(varRefExpr)) {
                            parts[i] = "'" + parts[i] + "'";
                        }
                        if (rep == "") {
                            rep = parts[i];
                        } else {
                            rep = rep + "+" + parts[i];
                        }
                    }
                }
                result = rep;
            }
            return result;
        },
        substituteParam: function(argValue, mode, element) {
            var result = argValue, varName = argValue, subs = null, msg, expo;
            if (result) {
                if (mode == 3) {
                    if (element.thObjectVar) {
                        subs = element.thObjectVar[varName];
                    }
                } else if (mode == 4) {
                    if (messages) {
                        msg = messages[varName];
                        if (msg) {
                            subs = msg;
                        }
                    }
                } else {
                    if (varName.charAt(0) === "#") {
                        if ("#object" === varName) {
                            if (element.thObjectVar) {
                                subs = element.thObjectVar;
                            }
                        } else {
                            expo = thExpressionObjects[varName];
                            if (typeof expo !== "undefined" && expo !== null) {
                                subs = expo;
                            }
                        }
                    }
                    if ((typeof subs === "undefined" || subs == null) && element.thLocalVars) {
                        subs = element.thLocalVars[varName];
                    }
                    if ((typeof subs === "undefined" || subs == null) && element.thObjectVar) {
                        subs = element.thObjectVar[varName];
                    }
                    if (typeof subs === "undefined" || subs == null) {
                        subs = Thymol.prototype.getParameter(varName);
                    }
                    if (typeof subs === "undefined" || subs == null) {
                        if ("param" === varName) {
                            subs = thymol.requestContext;
                        }
                        if ("session" === varName) {
                            subs = thymol.sessionContext;
                        }
                        if ("application" === varName) {
                            subs = thymol.applicationContext;
                        }
                    }
                }
                result = subs;
                if (subs instanceof ThParam) {
                    result = subs.value;
                }
            }
            return result;
        },
        doReplace: function(isNode, element, content) {
            if (isNode) {
                if (content.nodeName.toLowerCase() == "html") {
                    this.doInsertion(element, content, function(e, n) {
                        if (n.nodeType == 1) {
                            n.removeAttribute(thFragment.name);
                            n.removeAttribute(thFragment.synonym);
                        }
                        e.parentNode.insertBefore(n, e);
                    });
                    element.parentNode.removeChild(element);
                } else {
                    var node = this.doClone(content);
                    if (node.nodeType == 1) {
                        node.removeAttribute(thFragment.name);
                        node.removeAttribute(thFragment.synonym);
                    }
                    element.parentNode.replaceChild(node, element);
                }
            } else {
                try {
                    while (element.firstChild != null) {
                        element.removeChild(element.firstChild);
                        if (element.firstChild == null) {
                            break;
                        }
                    }
                    this.doInsertion(element, content, function(e, n) {
                        if (n.nodeType == 1) {
                            n.removeAttribute(thFragment.name);
                            n.removeAttribute(thFragment.synonym);
                        }
                        e.appendChild(n);
                    });
                } catch (err) {
                    element.innerHTML = content.innerHTML;
                }
            }
        },
        doClone: function(old) {
            var node = old.cloneNode(false), cNodes, i, iNode, aNode;
            if (node !== null) {
                if (node.nodeType == 1) {
                    if (old.thLocalVars !== null) {
                        node.thLocalVars = old.thLocalVars;
                    }
                }
                if (old.childNodes !== null) {
                    cNodes = old.childNodes.length;
                    if (cNodes > 0) {
                        for (i = 0; i < cNodes; i++) {
                            iNode = old.childNodes[i];
                            if (iNode !== null) {
                                aNode = this.doClone(iNode);
                                if (aNode !== null) {
                                    node.appendChild(aNode);
                                }
                            }
                        }
                    }
                }
            }
            return node;
        },
        doInsertion: function(element, content, func) {
            var topLevel = true, parent = element.parentElement, i, iLimit, iNode, elementName, j, jLimit, jNode, cJNode, cINode;
            if (parent != null) {
                topLevel = element.parentElement.nodeName.toLowerCase() == "html";
            }
            for (i = 0, iLimit = content.childNodes.length; i < iLimit; i++) {
                iNode = content.childNodes[i];
                if (iNode) {
                    if (!topLevel) {
                        elementName = iNode.nodeName.toLowerCase();
                        if (elementName != "head") {
                            if (elementName == "body") {
                                for (j = 0, jLimit = iNode.childNodes.length; j < jLimit; j++) {
                                    jNode = iNode.childNodes[j];
                                    if (jNode) {
                                        cJNode = this.doClone(jNode);
                                        func(element, cJNode);
                                    }
                                }
                            } else {
                                cINode = this.doClone(iNode);
                                func(element, cINode);
                            }
                        }
                    } else {
                        cINode = this.doClone(iNode);
                        func(element, cINode);
                    }
                }
            }
        },
        getThParam: function(paramName, isBoolean, isPath, defaultValue) {
            var localValue = defaultValue, theParam = this.getParameter(paramName), paramValue;
            if (isBoolean && theParam) {
                localValue = theParam.getBooleanValue();
            } else {
                try {
                    paramValue = window[paramName];
                    if (!(typeof paramValue === "undefined")) {
                        if (paramValue != null) {
                            if (isBoolean) {
                                localValue = paramValue == true;
                            } else {
                                localValue = paramValue;
                            }
                        }
                    }
                } catch (err) {
                    if (err instanceof ReferenceError) {}
                    if (err instanceof EvalError) {}
                }
            }
            if (!isBoolean && isPath && localValue.length > 0 && localValue.charAt(localValue.length - 1) != "/") {
                localValue = localValue + "/";
            }
            thymol.applicationContext.createVariable(paramName, localValue);
            return localValue;
        }
    };
    return {
        init: init,
        configureModule: configureModule,
        configureProcessor: configureProcessor,
        configurePreExecution: configurePreExecution,
        configurePostExecution: configurePostExecution,
        getBooleanValue: getBooleanValue,
        isFragmentChild: isFragmentChild,
        getMessage: getMessage,
        getLocale: getLocale,
        getExpression: getExpression
    };
}();

if (!Array.indexOf) {
    Array.prototype.indexOf = function(obj, start) {
        for (var i = start || 0; i < this.length; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}

function Clazz(nValue) {
    this.name = nValue;
}

ThParser = function(scope) {
    function object(o) {
        function F() {}
        F.prototype = o;
        return new F();
    }
    function NullReturn(varName) {
        this.varName = varName;
    }
    var TNUMBER = 0;
    var TOP1 = 1;
    var TOP2 = 2;
    var TVAR = 3;
    var TFUNCALL = 4;
    var MSGSUBST = 5;
    function Token(type_p, index_p, prio_p, number_p, mode_p) {
        this.type_ = type_p;
        this.index_ = index_p || 0;
        this.prio_ = prio_p || 0;
        this.number_ = number_p !== undefined && number_p !== null ? number_p : 0;
        this.mode_ = mode_p !== undefined && mode_p !== null ? mode_p : 0;
        this.toString = function() {
            switch (this.type_) {
              case TNUMBER:
                return this.number_;

              case TOP1:
              case TOP2:
              case TVAR:
                return this.index_;

              case TFUNCALL:
              case MSGSUBST:
                return "CALL";

              default:
                return "Invalid Token";
            }
        };
    }
    function Expression(tokens, ops1, ops2, functions, precision) {
        this.tokens = tokens;
        this.ops1 = ops1;
        this.ops2 = ops2;
        this.functions = functions;
        this.precision = precision;
    }
    Expression.prototype = {
        simplify: function(valuesParam) {
            var values = valuesParam || {};
            var nstack = [];
            var newexpression = [];
            var n1;
            var n2;
            var f;
            var L = this.tokens.length;
            var item;
            var i = 0;
            for (i = 0; i < L; i++) {
                item = this.tokens[i];
                var type_ = item.type_;
                if (type_ === TNUMBER) {
                    nstack.push(item);
                } else if (type_ === TVAR && !(item.index_ in new Object()) && item.index_ in values) {
                    item = new Token(TNUMBER, 0, 0, values[item.index_]);
                    nstack.push(item);
                } else if (type_ === TOP2 && nstack.length > 1) {
                    n2 = nstack.pop();
                    n1 = nstack.pop();
                    f = this.ops2[item.index_];
                    item = new Token(TNUMBER, 0, 0, f(n1.number_, n2.number_));
                    nstack.push(item);
                } else if (type_ === TOP1 && nstack.length > 0) {
                    if ("{" !== item.index_) {
                        n1 = nstack.pop();
                        f = this.ops1[item.index_];
                        item = new Token(TNUMBER, 0, 0, f(n1.number_));
                        nstack.push(item);
                    }
                } else {
                    while (nstack.length > 0) {
                        newexpression.push(nstack.shift());
                    }
                    newexpression.push(item);
                }
            }
            while (nstack.length > 0) {
                newexpression.push(nstack.shift());
            }
            var res = new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions), this.precision);
            return res;
        },
        evaluate: function(element, func) {
            var nstack = [];
            var n1;
            var n2;
            var f;
            var res = null;
            var L = this.tokens.length;
            var item;
            var i = 0;
            var result;
            for (i = 0; i < L; i++) {
                item = this.tokens[i];
                var type_ = item.type_;
                if (type_ === TNUMBER) {
                    nstack.push(item.number_);
                    if (i == L - 1) {
                        break;
                    }
                } else if (type_ === TOP2) {
                    n2 = nstack.pop();
                    if (typeof n2 === "undefined" || n2 instanceof NullReturn) {
                        n2 = null;
                    }
                    n1 = nstack.pop();
                    if (typeof n1 === "undefined" || n1 instanceof NullReturn) {
                        n1 = null;
                    }
                    f = this.ops2[item.index_];
                    try {
                        res = f(n1, n2);
                        if (f !== append) {
                            if (Object.prototype.toString.call(res) == "[object Array]") {
                                res.arrayResult = true;
                            }
                        }
                    } catch (err) {
                        if (!element.isBlockChild) {
                            var aValue = n1 == null ? "null" : n1;
                            var bValue = n2 == null ? "null" : n2;
                            var message = "while evaluating expression: " + this.tokens[i - 2].index_ + ": " + aValue + ", " + this.tokens[i - 1].index_ + ": " + bValue;
                            throw new ThError(message, element);
                        }
                    }
                    nstack.push(res);
                } else if (type_ === TVAR) {
                    var next = null, pushed = nstack.length;
                    if (item.index_ != null) {
                        if (L - 1 > i) {
                            next = this.tokens[i + 1];
                            if (next.type_ === TOP2 && next.index_ === ".") {
                                nstack.push(item.index_);
                            }
                        }
                        if (pushed === nstack.length) {
                            var val = func(item.index_, item.mode_, element);
                            if (Object.prototype.toString.call(val) == "[object Array]") {
                                val.arrayResult = true;
                            }
                            this.updatePrecision(val);
                            if (val === null) {
                                val = new NullReturn(item.index_);
                            }
                            nstack.push(val);
                        }
                    } else if (pushed === nstack.length && item.index_ in this.functions) {
                        nstack.push(this.functions[item.index_]);
                    } else {
                        if (!element.isBlockChild) {
                            throw new ThError("Exception undefined variable: " + item.index_, element);
                        }
                    }
                } else if (type_ === TOP1) {
                    n1 = nstack.pop();
                    if (typeof n1 === "undefined" || n1 instanceof NullReturn) {
                        n1 = null;
                    }
                    res = n1;
                    if ("{" === item.index_) {
                        if (typeof n1 === "string") {
                            var subst = func(n1, item.mode_, element);
                            if (subst != null) {
                                this.updatePrecision(subst);
                                res = subst;
                            }
                        }
                    } else {
                        f = this.ops1[item.index_];
                        try {
                            res = f(n1);
                        } catch (err) {
                            if (!element.isBlockChild) {
                                var aValue = n1 == null ? "null" : n1;
                                var message = "while evaluating expression: " + this.tokens[i - 2].index_ + ": " + aValue;
                                throw new ThError(message, element);
                            }
                        }
                    }
                    if (Object.prototype.toString.call(res) == "[object Array]") {
                        res.arrayResult = true;
                    }
                    nstack.push(res);
                } else if (type_ === TFUNCALL || type_ === MSGSUBST) {
                    n1 = nstack.pop();
                    f = nstack.pop();
                    if (type_ === MSGSUBST) {
                        if (f instanceof NullReturn) {
                            res = "??" + f.varName + "_" + thymol.getLocale() + "??";
                        } else {
                            res = ThUtils.renderMessage(f, n1);
                        }
                        nstack.push(res);
                    } else if (f.apply && f.call) {
                        if (n1 instanceof NullReturn) {
                            n1 = null;
                        }
                        if (n1 != null && (n1.arrayResult || Object.prototype.toString.call(n1) !== "[object Array]")) {
                            res = f.call(element, n1);
                        } else {
                            res = f.apply(element, n1);
                        }
                        if (res instanceof String) {
                            if (res.precision) {
                                if (typeof this.precision === "undefined" || res.precision > this.precision) {
                                    this.precision = res.precision;
                                }
                            }
                            res = res.toString();
                        } else if (Object.prototype.toString.call(res) == "[object Array]") {
                            res.arrayResult = true;
                        }
                        nstack.push(res);
                    } else {
                        if (!element.isBlockChild) {
                            throw new ThError(f + " is not a function", element);
                        }
                    }
                } else {
                    if (!element.isBlockChild) {
                        throw new ThError("invalid expression item type: " + type_, element);
                    }
                }
            }
            if (nstack.length > 1) {
                if (!element.isBlockChild) {
                    throw new ThError("invalid Expression (parity)", element);
                }
            }
            result = nstack[0];
            return result;
        },
        updatePrecision: function(val) {
            if (typeof val === "number") {
                var p = ThUtils.getDecimalDigits(val);
                if (typeof this.precision === "undefined" || p > this.precision) {
                    this.precision = p;
                }
            }
        }
    };
    function add(a, b) {
        return a + b;
    }
    function sub(a, b) {
        return a - b;
    }
    function mul(a, b) {
        return a * b;
    }
    function div(a, b) {
        return a / b;
    }
    function mod(a, b) {
        return a % b;
    }
    function concat(a, b) {
        return "" + a + b;
    }
    function neg(a) {
        return -a;
    }
    function not(a) {
        var v = thymol.getBooleanValue(a);
        return !v;
    }
    function random(a) {
        return Math.random() * (a || 1);
    }
    function fac(a) {
        var aa = Math.floor(a);
        var b = aa;
        while (aa > 1) {
            b = b * --aa;
        }
        return b;
    }
    function append(a, b) {
        if (a != null) {
            if (a.arrayResult === true || Object.prototype.toString.call(a) != "[object Array]") {
                return [ a, b ];
            }
        } else {
            if (b != null) {
                if (b.arrayResult === true || Object.prototype.toString.call(b) != "[object Array]") {
                    return [ a, b ];
                }
                return b;
            }
            return null;
        }
        var aa = a.slice();
        aa.push(b);
        return aa;
    }
    function equal(a, b) {
        return a == b;
    }
    function notEqual(a, b) {
        return a != b;
    }
    function gt(a, b) {
        return a > b;
    }
    function ge(a, b) {
        return a >= b;
    }
    function lt(a, b) {
        return a < b;
    }
    function le(a, b) {
        return a <= b;
    }
    function and(a, b) {
        return a && b;
    }
    function or(a, b) {
        return a || b;
    }
    function dot(a, b) {
        return a[b];
    }
    function binary(a, b) {
        return a ? b : null;
    }
    function elvis(a, b) {
        return a != null ? a : b;
    }
    function getStr(pos, expression, mode) {
        var localMode = mode;
        var s = "";
        var c = expression.charAt(pos);
        var start = pos + 1;
        var end = expression.length;
        var stopChar = c;
        if (localMode === 4 || c === "#") {
            stopChar = "}";
            localMode = 4;
        }
        var i = start;
        if (localMode !== 4 && c !== "'" && c !== '"') {
            for (;i <= end; i++) {
                if (c.toUpperCase() === c.toLowerCase()) {
                    if (i === pos || c === "}" || c !== "_" && c !== "?" && c !== ":" && (c < "0" || c > "9")) {
                        i = i - 1;
                        break;
                    }
                }
                s += c;
                c = expression.charAt(i);
            }
        } else {
            var quoted = false;
            if (c === "'" || c === '"') {
                quoted = true;
            }
            while (i <= end) {
                if (c === stopChar && i > start) {
                    if (localMode !== 4) {
                        s += c;
                    } else {
                        i = i - 1;
                    }
                    break;
                }
                var nc = expression.charAt(i);
                if (c === "\\") {
                    if (nc === "'" && s.charAt(s.length - 1) !== "\\") {
                        c = "&#39;";
                        if (i + 1 > end) {
                            break;
                        }
                        i = i + 1;
                        nc = expression.charAt(i);
                    }
                }
                if (!quoted) {
                    if (c === ".") {
                        var exp = thExpressionObjects[s];
                        if (typeof exp !== "undefined" && exp !== null) {
                            i -= 1;
                            break;
                        }
                    }
                    if (c === "(") {
                        i -= 1;
                        break;
                    }
                }
                s += c;
                if (i + 1 > end) {
                    break;
                }
                i = i + 1;
                c = nc;
            }
        }
        var str = new Object();
        str.str = s;
        str.pos = i;
        return str;
    }
    function ThParser() {
        this.precision;
        this.success = false;
        this.errormsg = "";
        this.expression = "";
        this.pos = 0;
        this.tokennumber = 0;
        this.tokenprio = 0;
        this.tokenindex = 0;
        this.tmpprio = 0;
        this.ops1 = {
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            asin: Math.asin,
            acos: Math.acos,
            atan: Math.atan,
            sqrt: Math.sqrt,
            log: Math.log,
            abs: Math.abs,
            ceil: Math.ceil,
            floor: Math.floor,
            round: Math.round,
            "-": neg,
            "!": not,
            not: not,
            exp: Math.exp
        };
        this.ops2 = {
            "?": binary,
            ":": elvis,
            "?:": elvis,
            "+": add,
            "-": sub,
            "*": mul,
            "/": div,
            "%": mod,
            "^": Math.pow,
            ",": append,
            "||": concat,
            "==": equal,
            eq: equal,
            "!=": notEqual,
            ne: notEqual,
            neq: notEqual,
            div: div,
            mod: mod,
            and: and,
            or: or,
            ">": gt,
            gt: gt,
            ">=": ge,
            "=>": ge,
            ge: ge,
            "<": lt,
            lt: lt,
            "<=": le,
            "=<": le,
            le: le,
            ".": dot,
            "[": dot
        };
        this.functions = {
            random: random,
            fac: fac,
            min: Math.min,
            max: Math.max,
            pow: Math.pow
        };
        this.consts = {
            E: Math.E,
            PI: Math.PI
        };
    }
    ThParser.parse = function(expr) {
        return new ThParser().parse(expr);
    };
    ThParser.evaluate = function(expr, element, func) {
        return ThParser.parse(expr).evaluate(element, func);
    };
    ThParser.Expression = Expression;
    ThParser.values = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        sqrt: Math.sqrt,
        log: Math.log,
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        random: random,
        fac: fac,
        exp: Math.exp,
        min: Math.min,
        max: Math.max,
        pow: Math.pow,
        E: Math.E,
        PI: Math.PI
    };
    var PRIMARY = 1 << 0;
    var OPERATOR = 1 << 1;
    var FUNCTION = 1 << 2;
    var LPAREN = 1 << 3;
    var RPAREN = 1 << 4;
    var COMMA = 1 << 5;
    var SIGN = 1 << 6;
    var CALL = 1 << 7;
    var NULLARY_CALL = 1 << 8;
    var LBRACK = 1 << 9;
    var RBRACK = 1 << 10;
    var LVARBRK = 1 << 11;
    var RVARBRK = 1 << 11;
    var OPTION = 1 << 12;
    ThParser.prototype = {
        parse: function(expr) {
            this.errormsg = "";
            this.success = true;
            var operstack = [];
            var tokenstack = [];
            var modestack = [];
            this.tmpprio = 0;
            var expected = PRIMARY | LPAREN | LVARBRK | FUNCTION | OPERATOR | SIGN | OPTION;
            var noperators = 0;
            this.expression = expr;
            this.pos = 0;
            this.mode = 0;
            while (this.pos < this.expression.length) {
                if (this.isWhite()) {} else if (this.isOperator()) {
                    if (this.isSign() && expected & SIGN) {
                        if (this.isNegativeSign()) {
                            this.tokenprio = 6;
                            this.tokenindex = "-";
                            noperators++;
                            this.addfunc(tokenstack, operstack, TOP1);
                        }
                        expected = PRIMARY | LPAREN | LVARBRK | FUNCTION | SIGN | OPTION;
                    } else if (this.isComment()) {} else {
                        if (this.tokenindex == "!") {
                            if ((expected & SIGN) === 0) {
                                this.error_parsing(this.pos, "unexpected sign");
                            }
                            noperators += 1;
                            this.addfunc(tokenstack, operstack, TOP1);
                        } else {
                            if ((expected & OPERATOR) === 0) {
                                this.error_parsing(this.pos, "unexpected operator");
                            }
                            noperators += 2;
                            this.addfunc(tokenstack, operstack, TOP2);
                        }
                        if (this.expression.charAt(this.pos - 1) === "[") {
                            this.tmpprio += 10;
                        }
                        expected = PRIMARY | OPERATOR | LPAREN | LVARBRK | FUNCTION | SIGN | OPTION;
                    }
                } else if (this.isNumber()) {
                    if ((expected & PRIMARY) === 0) {
                        this.error_parsing(this.pos, "unexpected number");
                    }
                    var token = new Token(TNUMBER, 0, 0, this.tokennumber);
                    tokenstack.push(token);
                    expected = OPERATOR | RPAREN | RBRACK | RVARBRK | COMMA;
                } else if (this.isLeftParenth()) {
                    if ((expected & LPAREN) === 0) {
                        this.error_parsing(this.pos, 'unexpected "("');
                    }
                    if (expected & CALL) {
                        noperators += 2;
                        this.tokenprio = -2;
                        this.tokenindex = -1;
                        this.tmpprio += 2;
                        var ft = TFUNCALL;
                        if (this.mode === 4) {
                            ft = MSGSUBST;
                        }
                        modestack.push(this.mode);
                        this.mode = 5;
                        this.addfunc(tokenstack, operstack, ft);
                        this.tmpprio -= 2;
                    }
                    if (this.mode === 5) {
                        this.tmpprio += 10;
                    }
                    expected = PRIMARY | OPERATOR | LPAREN | LVARBRK | FUNCTION | SIGN | OPTION | NULLARY_CALL;
                } else if (this.isRightParenth()) {
                    if (expected & NULLARY_CALL) {
                        var token = new Token(TNUMBER, 0, 0, []);
                        tokenstack.push(token);
                    } else if ((expected & RPAREN) === 0) {
                        this.error_parsing(this.pos, 'unexpected ")"');
                    }
                    if (this.mode === 5) {
                        this.tmpprio -= 10;
                    }
                    expected = OPERATOR | RPAREN | RBRACK | RVARBRK | COMMA | LPAREN | LVARBRK | CALL | OPTION;
                } else if (this.isRightBracket()) {
                    if ((expected & RBRACK) === 0) {
                        this.error_parsing(this.pos, 'unexpected "]"');
                    }
                    expected = OPERATOR | RPAREN | RBRACK | RVARBRK | COMMA | LPAREN | LVARBRK | CALL | OPTION;
                } else if (this.isLeftVarBrk(modestack)) {
                    if ((expected & LVARBRK) === 0) {
                        this.error_parsing(this.pos, 'unexpected "{"');
                    }
                    noperators += 1;
                    this.addfunc(tokenstack, operstack, TOP1);
                    expected = PRIMARY | LPAREN | LVARBRK | FUNCTION | SIGN | OPTION;
                } else if (this.isRightVarBrk()) {
                    if ((expected & RVARBRK) === 0) {
                        this.error_parsing(this.pos, 'unexpected "}"');
                    }
                    this.mode = modestack.pop();
                    expected = FUNCTION | OPERATOR | RPAREN | RBRACK | RVARBRK | COMMA | LPAREN | LVARBRK | CALL | OPTION;
                } else if (this.isComma()) {
                    if ((expected & COMMA) === 0) {
                        this.error_parsing(this.pos, 'unexpected ","');
                    }
                    if (this.mode === 5) {
                        this.tmpprio -= 10;
                    }
                    this.tmpprio += 2;
                    this.addfunc(tokenstack, operstack, TOP2);
                    this.tmpprio -= 2;
                    if (this.mode === 5) {
                        this.tmpprio += 10;
                    }
                    noperators += 2;
                    expected = PRIMARY | LPAREN | LVARBRK | FUNCTION | SIGN | OPTION;
                } else if (this.isConst()) {
                    if ((expected & PRIMARY) === 0) {
                        this.error_parsing(this.pos, "unexpected constant");
                    }
                    var consttoken = new Token(TNUMBER, 0, 0, this.tokennumber);
                    tokenstack.push(consttoken);
                    expected = OPERATOR | RPAREN | RVARBRK | RBRACK | COMMA;
                } else {
                    var str = getStr(this.pos, this.expression, this.mode);
                    if (this.isOpX(str, this.ops2)) {
                        if ("and" === str.str || "or" === str.str) {
                            this.tokenprio = 3;
                        }
                        if ((expected & OPERATOR) === 0) {
                            this.error_parsing(this.pos, "unexpected binary operator");
                        }
                        this.addfunc(tokenstack, operstack, TOP2);
                        noperators += 2;
                        expected = PRIMARY | LPAREN | LVARBRK | FUNCTION | OPERATOR | SIGN | OPTION;
                    } else if (this.isOpX(str, this.ops1)) {
                        if ((expected & OPERATOR) === 0) {
                            this.error_parsing(this.pos, "unexpected unary operator");
                        }
                        this.addfunc(tokenstack, operstack, TOP1);
                        noperators++;
                        expected = PRIMARY | LPAREN | LVARBRK | FUNCTION;
                    } else if (this.isLiteralValue(str)) {
                        if ((expected & PRIMARY) === 0) {
                            this.error_parsing(this.pos, "unexpected literal value");
                        }
                        var token = new Token(TNUMBER, 0, 0, this.tokennumber);
                        tokenstack.push(token);
                        expected = FUNCTION | OPERATOR | RPAREN | RBRACK | RVARBRK | COMMA | LPAREN | RVARBRK | LBRACK | CALL | OPTION;
                    } else if (this.isVar(str)) {
                        if ((expected & PRIMARY) === 0) {
                            this.error_parsing(this.pos, "unexpected variable");
                        }
                        var vartoken = new Token(TVAR, this.tokenindex, 0, 0, this.mode);
                        tokenstack.push(vartoken);
                        expected = FUNCTION | OPERATOR | RPAREN | RBRACK | RVARBRK | COMMA | LPAREN | RVARBRK | LBRACK | CALL | OPTION;
                    } else {
                        if (this.errormsg === "") {
                            this.error_parsing(this.pos, "unknown character");
                        } else {
                            this.error_parsing(this.pos, this.errormsg);
                        }
                    }
                }
            }
            if (this.tmpprio < 0 || this.tmpprio >= 10) {
                this.error_parsing(this.pos, 'unmatched "() or []"');
            }
            while (operstack.length > 0) {
                var tmp = operstack.pop();
                tokenstack.push(tmp);
            }
            if (noperators + 1 !== tokenstack.length) {
                this.error_parsing(this.pos, "parity");
            }
            var res = new Expression(tokenstack, object(this.ops1), object(this.ops2), object(this.functions), this.precision);
            return res;
        },
        evaluate: function(expr, element, func) {
            return this.parse(expr).evaluate(element, func);
        },
        error_parsing: function(column, msg) {
            this.success = false;
            this.errormsg = "parse error [column " + column + "]: " + msg;
            throw new Error(this.errormsg);
        },
        addfunc: function(tokenstack, operstack, type_) {
            var operator = new Token(type_, this.tokenindex, this.tokenprio + this.tmpprio, 0, this.mode);
            while (operstack.length > 0) {
                if (operator.prio_ <= operstack[operstack.length - 1].prio_) {
                    tokenstack.push(operstack.pop());
                } else {
                    break;
                }
            }
            operstack.push(operator);
        },
        isNumber: function() {
            var r = false;
            var str = "";
            var prec = -1;
            while (this.pos < this.expression.length) {
                var code = this.expression.charCodeAt(this.pos);
                if (code >= 48 && code <= 57 || code === 46) {
                    str += this.expression.charAt(this.pos);
                    if (prec >= 0 || code === 46) {
                        prec++;
                    }
                    this.pos++;
                    r = true;
                } else {
                    break;
                }
            }
            if (r) {
                if (prec >= 0 && (typeof this.precision === "undefined" || prec > this.precision)) {
                    this.precision = prec;
                }
                this.tokennumber = parseFloat(str);
            }
            return r;
        },
        isConst: function() {
            var str;
            for (var i in this.consts) {
                if (true) {
                    var L = i.length;
                    str = this.expression.substr(this.pos, L);
                    if (i === str) {
                        this.tokennumber = this.consts[i];
                        this.pos += L;
                        return true;
                    }
                }
            }
            return false;
        },
        isOperator: function() {
            var ch = this.expression.charAt(this.pos);
            if (ch === "+") {
                this.tokenprio = 0;
                this.tokenindex = "+";
            } else if (ch === "-") {
                this.tokenprio = 0;
                this.tokenindex = "-";
            } else if (ch === "|") {
                if (this.expression.charAt(this.pos + 1) === "|") {
                    this.pos++;
                    this.tokenprio = 0;
                    this.tokenindex = "||";
                } else {
                    return false;
                }
            } else if (ch === "*") {
                if (this.expression.charAt(this.pos + 1) === "{") {
                    return false;
                }
                this.tokenprio = 1;
                this.tokenindex = "*";
            } else if (ch === "/") {
                this.tokenprio = 2;
                this.tokenindex = "/";
            } else if (ch === "%") {
                this.tokenprio = 2;
                this.tokenindex = "%";
            } else if (ch === "^") {
                this.tokenprio = 3;
                this.tokenindex = "^";
            } else if (ch === "=" || ch === "!") {
                if (this.expression.charAt(this.pos + 1) === "=") {
                    if (ch === "=") {
                        this.tokenindex = "==";
                    } else if (ch === "!") {
                        this.tokenindex = "!=";
                    } else {
                        return false;
                    }
                    this.pos++;
                    this.tokenprio = 4;
                } else if (ch === "!") {
                    this.tokenprio = 6;
                    this.tokenindex = "!";
                } else {
                    return false;
                }
            } else if (ch === "<") {
                if (this.expression.charAt(this.pos + 1) === "=") {
                    this.tokenindex = "<=";
                    this.pos++;
                } else {
                    this.tokenindex = "<";
                }
                this.tokenprio = 4;
            } else if (ch === ">") {
                if (this.expression.charAt(this.pos + 1) === "=") {
                    this.tokenindex = ">=";
                    this.pos++;
                } else {
                    this.tokenindex = ">";
                }
                this.tokenprio = 4;
            } else if (ch === "." || ch === "[") {
                this.tokenprio = 10;
                this.tokenindex = ".";
            } else {
                return false;
            }
            this.pos++;
            return true;
        },
        isRightBracket: function() {
            var code = this.expression.charCodeAt(this.pos);
            if (code === 93) {
                this.pos++;
                this.tmpprio -= 10;
                return true;
            }
            return false;
        },
        isSign: function() {
            var code = this.expression.charCodeAt(this.pos - 1);
            if (code === 45 || code === 43) {
                return true;
            }
            return false;
        },
        isPositiveSign: function() {
            var code = this.expression.charCodeAt(this.pos - 1);
            if (code === 43) {
                return true;
            }
            return false;
        },
        isNegativeSign: function() {
            var code = this.expression.charCodeAt(this.pos - 1);
            if (code === 45) {
                return true;
            }
            return false;
        },
        isLeftParenth: function() {
            var code = this.expression.charCodeAt(this.pos);
            if (code === 40) {
                this.pos++;
                this.tmpprio += 10;
                return true;
            }
            return false;
        },
        isRightParenth: function() {
            var code = this.expression.charCodeAt(this.pos);
            if (code === 41) {
                this.pos++;
                this.tmpprio -= 10;
                return true;
            }
            return false;
        },
        isComma: function() {
            var code = this.expression.charCodeAt(this.pos);
            if (code === 44) {
                this.pos++;
                this.tokenprio = -1;
                this.tokenindex = ",";
                return true;
            }
            return false;
        },
        isWhite: function() {
            var code = this.expression.charCodeAt(this.pos);
            if (code === 32 || code === 9 || code === 10 || code === 13) {
                this.pos++;
                return true;
            }
            return false;
        },
        isLeftVarBrk: function(modestack) {
            var pp = this.pos, ch = this.expression.charAt(pp);
            if (ch === "$" || ch === "@" || ch === "*" || ch === "#") {
                pp++;
                var ch2 = this.expression.charAt(pp);
                if (ch2 === "{") {
                    pp++;
                    this.tmpprio += 10;
                    this.tokenprio = -4;
                    var oldMode = this.mode;
                    modestack.push(oldMode);
                    if (ch === "$") {
                        this.mode = 1;
                    } else if (ch === "@") {
                        this.mode = 2;
                    } else if (ch === "*") {
                        this.mode = 3;
                    } else if (ch === "#") {
                        this.mode = 4;
                    }
                    this.tokenindex = "{";
                    this.pos = pp;
                    return true;
                }
            }
            return false;
        },
        isRightVarBrk: function() {
            var code = this.expression.charCodeAt(this.pos);
            if (code === 125) {
                this.pos++;
                this.tmpprio -= 10;
                return true;
            }
            return false;
        },
        isOpX: function(str, group) {
            if (str.str.length > 0) {
                if (str.str in new Object()) {
                    return false;
                }
                if (str.str in group) {
                    this.tokenindex = str.str;
                    this.tokenprio = 5;
                    this.pos = str.pos;
                    return true;
                }
            }
            return false;
        },
        isLiteralValue: function(str) {
            if (typeof str.str === "string") {
                var first = str.str.charAt(0);
                var last = str.str.charAt(str.str.length - 1);
                if (first == "'" && last == "'" || first == '"' && last == '"') {
                    this.tokennumber = str.str.substring(1, str.str.length - 1);
                    this.pos = str.pos;
                    return true;
                }
            }
            return false;
        },
        isVar: function(str) {
            if (str.str.length > 0) {
                this.tokenindex = str.str;
                this.tokenprio = 4;
                this.pos = str.pos;
                return true;
            }
            return false;
        },
        isComment: function() {
            var code = this.expression.charCodeAt(this.pos - 1);
            if (code === 47 && this.expression.charCodeAt(this.pos) === 42) {
                this.pos = this.expression.indexOf("*/", this.pos) + 2;
                if (this.pos === 1) {
                    this.pos = this.expression.length;
                }
                return true;
            }
            return false;
        }
    };
    return ThParser;
}();

var thHttpSessionObject = function() {
    var thExpressionObjectName = "#httpSession";
    function getAttribute(name) {
        var result = thymol.sessionContext[name];
        return result;
    }
    function getParameter(name) {
        var result = thymol.sessionContext[name];
        return result;
    }
    function getServletContext() {
        var result = thymol.applicationContext;
        return result;
    }
    function getSessionContext() {
        var result = thymol.sessionContext;
        return result;
    }
    function getContextPath() {
        var result = "";
        return result;
    }
    function getRequestName() {
        var result = "";
        return result;
    }
    function getParameterValues(name) {
        var result = thymol.sessionContext[name];
        return result;
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        getAttribute: getAttribute,
        getParameter: getParameter,
        getServletContext: getServletContext,
        getSessionContext: getSessionContext,
        getContextPath: getContextPath,
        getRequestName: getRequestName,
        getParameterValues: getParameterValues
    };
}();

var thHttpServletRequestObject = function() {
    var thExpressionObjectName = "#httpServletRequest";
    function getAttribute(name) {
        var result = thymol.requestContext[name][0];
        if (result instanceof ThParam) {
            result = ThUtils.unQuote(result.value);
        }
        return result;
    }
    function getParameter(name) {
        var result = thymol.requestContext[name];
        return result;
    }
    function getContextPath() {
        var result = "";
        return result;
    }
    function getRequestName() {
        var result = "";
        return result;
    }
    function getParameterValues(name) {
        var result = thymol.requestContext[name];
        return result;
    }
    function getSession(create) {
        return thHttpSessionObject;
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        getAttribute: getAttribute,
        getParameter: getParameter,
        getContextPath: getContextPath,
        getRequestName: getRequestName,
        getParameterValues: getParameterValues,
        getSession: getSession
    };
}();

$(function() {
    thymol.configureModule(thHttpServletRequestObject);
    thymol.configureModule(thHttpSessionObject);
    if (typeof thObjectsConfigureModules !== "undefined") {
        thObjectsConfigureModules();
    }
    thymol.init();
});

$(window).unload(function() {
    if (thymol.sessionContext && thymol.sessionContext.persist) {
        thymol.sessionContext.persist();
    }
});

var thAggregatesObject = function() {
    var thExpressionObjectName = "#aggregates";
    function sum(target) {
        return aggregate(target, false, "sum");
    }
    function avg(target) {
        return aggregate(target, true, "avg");
    }
    function aggregate(target, doAvg, label) {
        if (target !== null) {
            var result = 0;
            var count;
            var tt = typeof target;
            var ptc = Object.prototype.toString.call(target);
            if (tt === "Array" || ptc === "[object Array]") {
                count = target.length;
                for (var i = 0; i < count; i++) {
                    if (target[i] !== null) {
                        result += target[i];
                    } else {
                        throw new ThError("#aggregates." + label + " Cannot aggregate on object containing nulls");
                    }
                }
            } else {
                count = 0;
                for (var k in target) {
                    var value = target[k];
                    var process = false;
                    if (value !== null) {
                        if (target instanceof ThSet) {
                            process = target.isContent(k);
                        } else {
                            process = target.hasOwnProperty(k) && typeof value !== "function";
                        }
                    } else {
                        throw new ThError("#aggregates." + label + " Cannot aggregate on object containing nulls");
                    }
                    if (process) {
                        result += value;
                        count++;
                    }
                }
            }
            if (doAvg) {
                if (count == 0) {
                    throw new ThError("#aggregates." + label + " Cannot get size of object");
                }
                result = result / count;
            }
            return result;
        }
        throw new ThError("#aggregates." + label + " Cannot aggregate on null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        sum: sum,
        avg: avg
    };
}();

var thArraysObject = function() {
    var thExpressionObjectName = "#arrays";
    function toArray(target) {
        if (target !== null) {
            return toTypedArray(null, target);
        }
        throw new ThError("#arrays.toArray Cannot convert null to array");
    }
    function toStringArray(target) {
        if (target !== null) {
            return toTypedArray("string", target);
        }
        throw new ThError("#arrays.toStringArray Cannot convert null to array");
    }
    function toNumberArray(target) {
        if (target !== null) {
            return toTypedArray("number", target);
        }
        throw new ThError("#arrays.toNumberArray Cannot convert null to array");
    }
    function toBooleanArray(target) {
        if (target !== null) {
            return toTypedArray("boolean", target);
        }
        throw new ThError("#arrays.toBooleanArray Cannot convert null to array");
    }
    function toTypedArray(componentClass, target) {
        if (target instanceof Array) {
            if (componentClass === null || componentClass === "undefined") {
                return target;
            }
            var result = new Array();
            try {
                for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                    if (target[i] !== null) {
                        if (componentClass === "string") {
                            result.push(new String(target[i]).valueOf());
                        } else if (componentClass === "number") {
                            result.push(new Number(target[i]).valueOf());
                        } else if (componentClass === "boolean") {
                            result.push(new Boolean(target[i]).valueOf());
                        } else {
                            result.push(target[i]);
                        }
                    }
                }
            } catch (err) {
                throw new IllegalArgumentException('#arrays.toArray Cannot convert object of class "' + targetComponentClass.getName() + '[]" to an array' + " of " + componentClass.getClass().getSimpleName());
            }
            return result;
        } else if (target instanceof Object) {
            var result = new Array();
            try {
                for (var k in target) {
                    var value = target[k];
                    var process = false;
                    if (value !== null) {
                        if (target instanceof ThSet) {
                            process = target.isContent(k);
                        } else {
                            process = target.hasOwnProperty(k) && typeof value !== "function";
                        }
                    }
                    if (process) {
                        if (componentClass === "string") {
                            result.push(new String(value).valueOf());
                        } else if (componentClass === "number") {
                            result.push(new Number(value).valueOf());
                        } else if (componentClass === "boolean") {
                            result.push(new Boolean(value).valueOf());
                        } else {
                            result.push(value);
                        }
                    }
                }
            } catch (err) {
                throw new IllegalArgumentException('#arrays.toArray Cannot convert object of class "' + targetComponentClass.getName() + '[]" to an array' + " of " + componentClass.getClass().getSimpleName());
            }
            return result;
        } else {
            throw new ThError('#arrays.toArray Cannot convert object of type "' + typeof target + '" to an array' + (componentClass == null ? "" : " of " + componentClass));
        }
    }
    function length(target) {
        if (target !== null) {
            return target.length;
        }
        throw new ThError("#arrays.length Cannot get array length of null");
    }
    function isEmpty(target) {
        return target === null || target.length <= 0;
    }
    function contains(target, element) {
        if (target !== null) {
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] === null) {
                    if (element === null) {
                        return true;
                    }
                } else if (element !== null && target[i] === element) {
                    return true;
                }
            }
            return false;
        }
        throw new ThError("#arrays.contains Cannot execute array contains: target is null");
    }
    function containsAll(target, elements) {
        if (target !== null) {
            if (elements !== null) {
                var elementsArray;
                if (elements instanceof Array) {
                    elementsArray = [].concat(elements);
                } else {
                    if (elements instanceof ThSet) {
                        elementsArray = elements.toArray();
                    } else {
                        elementsArray = [];
                        for (var k in elements) {
                            if (elements.hasOwnProperty(k) && typeof elements[k] !== "function") {
                                elementsArray.push(elements[k]);
                            }
                        }
                    }
                }
                for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                    for (var j = 0, jLimit = elementsArray.length; j < jLimit; j++) {
                        if (target[i] === elementsArray[j]) {
                            elementsArray.splice(j, 1);
                        }
                    }
                }
                return elementsArray.length === 0;
            }
            throw new ThError("#arrays.containsAll Cannot execute array containsAll: elements is null");
        }
        throw new ThError("#arrays.containsAll Cannot execute array containsAll: target is null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        toArray: toArray,
        toStringArray: toStringArray,
        toIntegerArray: toNumberArray,
        toLongArray: toNumberArray,
        toDoubleArray: toNumberArray,
        toFloatArray: toNumberArray,
        toBooleanArray: toBooleanArray,
        length: length,
        isEmpty: isEmpty,
        contains: contains,
        containsAll: containsAll
    };
}();

var thBoolsObject = function() {
    var thExpressionObjectName = "#bools";
    function isTrue(target) {
        var result = true;
        var tc;
        if (target == null || (tc = typeof target) === "undefined") {
            result = false;
        } else {
            if (tc === "boolean") {
                result = target;
            } else if (tc === "number") {
                result = target != 0;
            } else if (tc === "string") {
                if (target.length === 1) {
                    result = target.charCodeAt(0) != 0;
                } else if (ThUtils.testLiteralFalse(target)) {
                    result = false;
                }
            }
        }
        return result;
    }
    function arrayIsTrue(target) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(isTrue(target[i]));
            }
            return result;
        }
        throw new ThError("#bools.arrayIsTrue Target cannot be null");
    }
    function setIsTrue(target) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(isTrue(target[k]));
                }
            }
            return result;
        }
        throw new ThError("#bools.setIsTrue Target cannot be null");
    }
    function isFalse(target) {
        return !isTrue(target);
    }
    function arrayIsFalse(target) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(!isTrue(target[i]));
            }
            return result;
        }
        throw new ThError("#bools.arrayIsFalse Target cannot be null");
    }
    function setIsFalse(target) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(!isTrue(target[k]));
                }
            }
            return result;
        }
        throw new ThError("#bools.setIsFalse Target cannot be null");
    }
    function arrayAnd(target) {
        if (target !== null) {
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (!isTrue(target[i])) {
                    return false;
                }
            }
            return true;
        }
        throw new ThError("#bools.arrayAnd Target cannot be null");
    }
    function setAnd(target) {
        if (target !== null) {
            for (var k in target) {
                if (target.isContent(k)) {
                    if (!isTrue(target[k])) {
                        return false;
                    }
                }
            }
            return true;
        }
        throw new ThError("#bools.setAnd Target cannot be null");
    }
    function arrayOr(target) {
        if (target !== null) {
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (isTrue(target[i])) {
                    return true;
                }
            }
            return false;
        }
        throw new ThError("#bools.arrayOr Target cannot be null");
    }
    function setOr(target) {
        if (target !== null) {
            for (var k in target) {
                if (target.isContent(k)) {
                    if (isTrue(target[k])) {
                        return true;
                    }
                }
            }
            return false;
        }
        throw new ThError("#bools.setOr Target cannot be null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        isTrue: isTrue,
        arrayIsTrue: arrayIsTrue,
        listIsTrue: arrayIsTrue,
        setIsTrue: setIsTrue,
        isFalse: isFalse,
        arrayIsFalse: arrayIsFalse,
        listIsFalse: arrayIsFalse,
        setIsFalse: setIsFalse,
        arrayAnd: arrayAnd,
        listAnd: arrayAnd,
        setAnd: setAnd,
        arrayOr: arrayOr,
        listOr: arrayOr,
        setOr: setOr
    };
}();

var thDatesObject = function() {
    var thExpressionObjectName = "#dates";
    function createProxy() {
        if (arguments !== null) {
            if (arguments.length > 6) {
                return create(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
            } else if (arguments.length > 5) {
                return create(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], 0);
            } else if (arguments.length > 4) {
                return create(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], 0, 0);
            }
            return create(arguments[0], arguments[1], arguments[2], 0, 0, 0, 0);
        }
    }
    function create(year, month, day, hour, minute, second, millisecond) {
        var result = new Date();
        result.setFullYear(year);
        result.setMonth(month - 1);
        result.setDate(day);
        result.setHours(hour);
        result.setMinutes(minute);
        result.setSeconds(second);
        result.setMilliseconds(millisecond);
        return result;
    }
    function getDay(dateValue) {
        var month = dateValue.getMonth() + 1;
        var year = dateValue.getFullYear();
        var day = dateValue.getDate();
        var a = Math.floor((14 - month) / 12);
        var y = year + 4800 - a;
        var m = month + 12 * a - 3;
        var jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4);
        if (jdn < 2331254) {
            jdn = jdn - 32083;
        } else {
            jdn = jdn - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        }
        var mjdn = (jdn + 1) % 7;
        return mjdn;
    }
    function createNow() {
        return new Date();
    }
    function createToday() {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }
    function format(dateParam, patternParam, locale) {
        var pattern = "";
        var date;
        if (arguments === null) {
            date = new Date();
        } else {
            if (arguments.length > 1) {
                pattern = patternParam;
            }
            date = dateParam;
        }
        return formatDate(date, pattern, locale);
    }
    function formatDate(target, patternParam, locale) {
        var pattern = "";
        if (arguments.length > 1) {
            pattern = patternParam;
        }
        var result = dateFormat(target, pattern, false);
        return result;
    }
    function arrayFormat(target, patternParam) {
        var pattern = "";
        if (arguments.length > 1) {
            pattern = patternParam;
        }
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(dateFormat(target[i], pattern, false));
        }
        return result;
    }
    function setFormat(target, patternParam) {
        var pattern = "";
        if (arguments.length > 1) {
            pattern = patternParam;
        }
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(dateFormat(target[k], pattern, false));
            }
        }
        return result;
    }
    function day(target) {
        return target.getDate();
    }
    function arrayDay(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getDate());
        }
        return result;
    }
    function setDay(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getDate());
            }
        }
        return result;
    }
    function month(target) {
        return target.getMonth() + 1;
    }
    function arrayMonth(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getMonth() + 1);
        }
        return result;
    }
    function setMonth(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getMonth() + 1);
            }
        }
        return result;
    }
    function monthName(target) {
        return dateFormat.i18n.monthNames[target.getMonth() + 12];
    }
    function arrayMonthName(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(dateFormat.i18n.monthNames[target[i].getMonth() + 12]);
        }
        return result;
    }
    function setMonthName(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(dateFormat.i18n.monthNames[target[k].getMonth() + 12]);
            }
        }
        return result;
    }
    function monthNameShort(target) {
        return dateFormat.i18n.monthNames[target.getMonth()];
    }
    function arrayMonthNameShort(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(dateFormat.i18n.monthNames[target[i].getMonth()]);
        }
        return result;
    }
    function setMonthNameShort(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(dateFormat.i18n.monthNames[target[k].getMonth()]);
            }
        }
        return result;
    }
    function year(target) {
        return target.getFullYear();
    }
    function arrayYear(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getFullYear());
        }
        return result;
    }
    function setYear(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getFullYear());
            }
        }
        return result;
    }
    function dayOfWeek(target) {
        return getDay(target) + 1;
    }
    function arrayDayOfWeek(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(getDay(target[i]) + 1);
        }
        return result;
    }
    function setDayOfWeek(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(getDay(target[k]) + 1);
            }
        }
        return result;
    }
    function dayOfWeekName(target) {
        return dateFormat.i18n.dayNames[getDay(target) + 7];
    }
    function arrayDayOfWeekName(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(dateFormat.i18n.dayNames[getDay(target[i]) + 7]);
        }
        return result;
    }
    function setDayOfWeekName(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(dateFormat.i18n.dayNames[getDay(target[k]) + 7]);
            }
        }
        return result;
    }
    function dayOfWeekNameShort(target) {
        return dateFormat.i18n.dayNames[getDay(target)];
    }
    function arrayDayOfWeekNameShort(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(dateFormat.i18n.dayNames[getDay(target[i])]);
        }
        return result;
    }
    function setDayOfWeekNameShort(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(dateFormat.i18n.dayNames[getDay(target[k])]);
            }
        }
        return result;
    }
    function hour(target) {
        return target.getHours();
    }
    function arrayHour(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getHours());
        }
        return result;
    }
    function setHour(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getHours());
            }
        }
        return result;
    }
    function minute(target) {
        return target.getMinutes();
    }
    function arrayMinute(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getMinutes());
        }
        return result;
    }
    function setMinute(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getMinutes());
            }
        }
        return result;
    }
    function second(target) {
        return target.getSeconds();
    }
    function arraySecond(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getSeconds());
        }
        return result;
    }
    function setSecond(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getSeconds());
            }
        }
        return result;
    }
    function millisecond(target) {
        return target.getMilliseconds();
    }
    function arrayMillisecond(target) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(target[i].getMilliseconds());
        }
        return result;
    }
    function setMillisecond(target) {
        var result = new ThSet();
        for (var k in target) {
            if (target.isContent(k)) {
                result.add(target[k].getMilliseconds());
            }
        }
        return result;
    }
    var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g, timezoneClip = /[^-+\dA-Z]/g;
    function processTZ(target) {
        var toStr = String(target);
        var result = toStr;
        result = (result.match(timezone) || [ "" ]).pop();
        if ("" !== result) {
            result = result.replace(timezoneClip, "");
            var tail = toStr.match(/[\(]((?:[GL]M|BS)T[^\)]*?)[\)]/);
            if (tail) {
                if (target.getFullYear() > 1916 || target.getFullYear() === 1916 && target.getMonth() > 4 || target.getFullYear() === 1916 && target.getMonth() === 4 && target.getDate() > 20) {
                    result = result.replace(/GMT\+\d{1,4}/, "BST");
                } else {
                    result = result.replace(/GMT\+\d{1,4}/, "GMT");
                }
            }
        }
        return result;
    }
    var dateFormat = function() {
        var token = /d{1,4}|M{1,4}|yy(?:yy)?|([HhmsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g, pad = function(valp, lenp) {
            var val = String(valp), len = lenp || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };
        return function(datep, maskp, utcp) {
            var dF = dateFormat, mask = maskp, date = datep, utc = utcp;
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined;
            }
            date = date ? new Date(date) : new Date();
            if (isNaN(date)) throw SyntaxError("invalid date");
            mask = String(dF.masks[mask] || mask || dF.masks["default"]);
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true;
            }
            var _ = utc ? "getUTC" : "get", d = date[_ + "Date"](), D = getDay(date), M = date[_ + "Month"](), y = date[_ + "FullYear"](), H = date[_ + "Hours"](), m = date[_ + "Minutes"](), s = date[_ + "Seconds"](), L = date[_ + "Milliseconds"](), o = utc ? 0 : date.getTimezoneOffset(), flags = {
                d: d,
                dd: pad(d),
                ddd: dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                M: M + 1,
                MM: pad(M + 1),
                MMM: dF.i18n.monthNames[M],
                MMMM: dF.i18n.monthNames[M + 12],
                yy: String(y).slice(2),
                yyyy: y,
                h: H % 12 || 12,
                hh: pad(H % 12 || 12),
                H: H,
                HH: pad(H),
                m: m,
                mm: pad(m),
                s: s,
                ss: pad(s),
                l: pad(L, 3),
                L: pad(L > 99 ? Math.round(L / 10) : L),
                t: H < 12 ? "a" : "p",
                tt: H < 12 ? "am" : "pm",
                T: H < 12 ? "A" : "P",
                TT: H < 12 ? "AM" : "PM",
                Z: utc ? "UTC" : processTZ(date),
                o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S: [ "th", "st", "nd", "rd" ][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };
            return mask.replace(token, function($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };
    }();
    dateFormat.masks = {
        "default": "dd MMMM yyyy HH:mm:ss Z",
        shortDate: "M/d/yy",
        mediumDate: "MMM d, yyyy",
        longDate: "MMMM d, yyyy",
        fullDate: "dddd, MMMM d, yyyy",
        shortTime: "h:mm TT",
        mediumTime: "h:mm:ss TT",
        longTime: "h:mm:ss TT Z",
        isoDate: "yyyy-MM-dd",
        isoTime: "HH:mm:ss",
        isoDateTime: "yyyy-MM-dd'T'HH:mm:ss",
        isoUtcDateTime: "UTC:yyyy-MM-dd'T'HH:mm:ss'Z'"
    };
    dateFormat.i18n = {
        dayNames: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
        monthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]
    };
    Date.prototype.format = function(mask, utc) {
        return dateFormat(this, mask, utc);
    };
    return {
        thExpressionObjectName: thExpressionObjectName,
        create: createProxy,
        createNow: createNow,
        createNowForTimeZone: createNow,
        createToday: createToday,
        createTodayForTimeZone: createToday,
        format: format,
        dateFormat: dateFormat,
        arrayFormat: arrayFormat,
        listFormat: arrayFormat,
        setFormat: setFormat,
        day: day,
        arrayDay: arrayDay,
        listDay: arrayDay,
        setDay: setDay,
        month: month,
        arrayMonth: arrayMonth,
        listMonth: arrayMonth,
        setMonth: setMonth,
        monthName: monthName,
        arrayMonthName: arrayMonthName,
        listMonthName: arrayMonthName,
        setMonthName: setMonthName,
        monthNameShort: monthNameShort,
        arrayMonthNameShort: arrayMonthNameShort,
        listMonthNameShort: arrayMonthNameShort,
        setMonthNameShort: setMonthNameShort,
        year: year,
        arrayYear: arrayYear,
        listYear: arrayYear,
        setYear: setYear,
        dayOfWeek: dayOfWeek,
        arrayDayOfWeek: arrayDayOfWeek,
        listDayOfWeek: arrayDayOfWeek,
        setDayOfWeek: setDayOfWeek,
        dayOfWeekName: dayOfWeekName,
        arrayDayOfWeekName: arrayDayOfWeekName,
        listDayOfWeekName: arrayDayOfWeekName,
        setDayOfWeekName: setDayOfWeekName,
        dayOfWeekNameShort: dayOfWeekNameShort,
        arrayDayOfWeekNameShort: arrayDayOfWeekNameShort,
        listDayOfWeekNameShort: arrayDayOfWeekNameShort,
        setDayOfWeekNameShort: setDayOfWeekNameShort,
        hour: hour,
        arrayHour: arrayHour,
        listHour: arrayHour,
        setHour: setHour,
        minute: minute,
        arrayMinute: arrayMinute,
        listMinute: arrayMinute,
        setMinute: setMinute,
        second: second,
        arraySecond: arraySecond,
        listSecond: arraySecond,
        setSecond: setSecond,
        millisecond: millisecond,
        arrayMillisecond: arrayMillisecond,
        listMillisecond: arrayMillisecond,
        setMillisecond: setMillisecond
    };
}();

var thCalendarsObject = function() {
    var thExpressionObjectName = "#calendars";
    return {
        thExpressionObjectName: thExpressionObjectName,
        create: thDatesObject.create,
        createNow: thDatesObject.createNow,
        createNowForTimeZone: thDatesObject.createNow,
        createToday: thDatesObject.createToday,
        createTodayForTimeZone: thDatesObject.createToday,
        format: thDatesObject.format,
        dateFormat: thDatesObject.dateFormat,
        arrayFormat: thDatesObject.arrayFormat,
        listFormat: thDatesObject.arrayFormat,
        setFormat: thDatesObject.setFormat,
        day: thDatesObject.day,
        arrayDay: thDatesObject.arrayDay,
        listDay: thDatesObject.arrayDay,
        setDay: thDatesObject.setDay,
        month: thDatesObject.month,
        arrayMonth: thDatesObject.arrayMonth,
        listMonth: thDatesObject.arrayMonth,
        setMonth: thDatesObject.setMonth,
        monthName: thDatesObject.monthName,
        arrayMonthName: thDatesObject.arrayMonthName,
        listMonthName: thDatesObject.arrayMonthName,
        setMonthName: thDatesObject.setMonthName,
        monthNameShort: thDatesObject.monthNameShort,
        arrayMonthNameShort: thDatesObject.arrayMonthNameShort,
        listMonthNameShort: thDatesObject.arrayMonthNameShort,
        setMonthNameShort: thDatesObject.setMonthNameShort,
        year: thDatesObject.year,
        arrayYear: thDatesObject.arrayYear,
        listYear: thDatesObject.arrayYear,
        setYear: thDatesObject.setYear,
        dayOfWeek: thDatesObject.dayOfWeek,
        arrayDayOfWeek: thDatesObject.arrayDayOfWeek,
        listDayOfWeek: thDatesObject.arrayDayOfWeek,
        setDayOfWeek: thDatesObject.setDayOfWeek,
        dayOfWeekName: thDatesObject.dayOfWeekName,
        arrayDayOfWeekName: thDatesObject.arrayDayOfWeekName,
        listDayOfWeekName: thDatesObject.arrayDayOfWeekName,
        setDayOfWeekName: thDatesObject.setDayOfWeekName,
        dayOfWeekNameShort: thDatesObject.dayOfWeekNameShort,
        arrayDayOfWeekNameShort: thDatesObject.arrayDayOfWeekNameShort,
        listDayOfWeekNameShort: thDatesObject.arrayDayOfWeekNameShort,
        setDayOfWeekNameShort: thDatesObject.setDayOfWeekNameShort,
        hour: thDatesObject.hour,
        arrayHour: thDatesObject.arrayHour,
        listHour: thDatesObject.arrayHour,
        setHour: thDatesObject.setHour,
        minute: thDatesObject.minute,
        arrayMinute: thDatesObject.arrayMinute,
        listMinute: thDatesObject.arrayMinute,
        setMinute: thDatesObject.setMinute,
        second: thDatesObject.second,
        arraySecond: thDatesObject.arraySecond,
        listSecond: thDatesObject.arraySecond,
        setSecond: thDatesObject.setSecond,
        millisecond: thDatesObject.millisecond,
        arrayMillisecond: thDatesObject.arrayMillisecond,
        listMillisecond: thDatesObject.arrayMillisecond,
        setMillisecond: thDatesObject.setMillisecond
    };
}();

var thIdsObject = function() {
    var thExpressionObjectName = "#ids";
    function seq(id) {
        if (id !== null) {
            var str = id.toString();
            var idCount = getLocal(str);
            var result = str + idCount;
            idCount++;
            setLocal(str, idCount);
            return result;
        }
        throw new ThError("#ids.seq ID Cannot be null");
    }
    function next(id) {
        if (id !== null) {
            var str = id.toString();
            var idCount = getLocal(str);
            return str + idCount;
        }
        throw new ThError("#ids.next ID Cannot be null");
    }
    function prev(id) {
        if (id !== null) {
            var str = id.toString();
            var idCount = getLocal(str);
            return str + (idCount - 1);
        }
        throw new ThError("#ids.prev ID Cannot be null");
    }
    function setLocal(str, idCount) {
        if (!thIdsObject.thLocalVars) {
            thIdsObject.thLocalVars = [];
        }
        if (!thIdsObject.thLocalVars["thIdCounts"]) {
            thIdsObject.thLocalVars["thIdCounts"] = [];
        }
        thIdsObject.thLocalVars["thIdCounts"][str] = idCount;
    }
    function getLocal(str) {
        if (!thIdsObject.thLocalVars) {
            thIdsObject.thLocalVars = [];
        }
        if (!thIdsObject.thLocalVars["thIdCounts"]) {
            thIdsObject.thLocalVars["thIdCounts"] = [];
        }
        if (!thIdsObject.thLocalVars["thIdCounts"][str]) {
            thIdsObject.thLocalVars["thIdCounts"][str] = 1;
        }
        return thIdsObject.thLocalVars["thIdCounts"][str];
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        seq: seq,
        next: next,
        prev: prev
    };
}();

var thListsObject = function() {
    var thExpressionObjectName = "#lists";
    function sort(list, comparator) {
        if (list !== null) {
            if (arguments.length > 1) {
                if (comparator !== null) {
                    if (typeof comparator === "function") {
                        return list.sort(comparator);
                    }
                    throw new ThError("#lists.sort Cannot execute list sort: comparator is not a function");
                }
                throw new ThError("#lists.sort Cannot execute list sort: comparator is null");
            }
            return list.sort();
        }
        throw new ThError("#lists.sort Cannot execute list sort: list is null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        toList: thArraysObject.toArray,
        size: thArraysObject.length,
        isEmpty: thArraysObject.isEmpty,
        contains: thArraysObject.contains,
        containsAll: thArraysObject.containsAll,
        sort: sort
    };
}();

var thMapsObject = function() {
    var thExpressionObjectName = "#maps";
    function size(target) {
        if (target !== null) {
            if (target instanceof ThMap) {
                return target.size();
            }
            throw new ThError('#maps.size Cannot get size of non-map type "' + typeof target + '"');
        }
        throw new ThError("#maps.size Cannot get size of null");
    }
    function isEmpty(target) {
        if (target !== null) {
            if (target instanceof ThMap) {
                return target.isEmpty();
            }
            throw new ThError('#maps.size Cannot get isEmpty of non-map type "' + typeof target + '"');
        }
        throw new ThError("#maps.size Cannot get isEmpty of null");
    }
    function containsKey(target, key) {
        if (target !== null) {
            if (target instanceof ThMap) {
                return target.containsKey(key);
            }
            throw new ThError('#maps.size Cannot get containsKey of non-map type "' + typeof target + '"');
        }
        throw new ThError("#maps.containsKey Cannot execute map containsKey: target is null");
    }
    function containsValue(target, value) {
        if (target !== null) {
            if (target instanceof ThMap) {
                return target.containsValue(value);
            }
            throw new ThError('#maps.size Cannot get containsValue of non-map type "' + typeof target + '"');
        }
        throw new ThError("#maps.containsKey Cannot execute map containsValue: target is null");
    }
    function containsAllKeys(target, keys) {
        if (target !== null) {
            if (target instanceof ThMap) {
                var ptc = Object.prototype.toString.call(keys);
                if (keys instanceof ThSet || keys instanceof Array || ptc === "[object Array]") {
                    return target.containsAll(keys);
                }
                throw new ThError('#maps.size Cannot get containsAllKeys with non-collection type "' + ptc + '"');
            }
            throw new ThError('#maps.size Cannot get containsAllKeys of non-map type "' + typeof target + '"');
        }
        throw new ThError("#maps.containsKey Cannot execute map containsAllKeys: target is null");
    }
    function containsAllValues(target, values) {
        if (target !== null) {
            if (target instanceof ThMap) {
                var ptc = Object.prototype.toString.call(values);
                if (values instanceof ThSet || values instanceof Array || ptc === "[object Array]") {
                    var vArray = values;
                    if (values instanceof ThSet) {
                        vArray = values.toArray();
                    }
                    for (var i = 0, iLimit = vArray.length; i < iLimit; i++) {
                        var found = false;
                        for (var k in target) {
                            if (target.hasOwnProperty(k)) {
                                var value = target[k];
                                if (value === vArray[i]) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (!found) {
                            return false;
                        }
                    }
                    return true;
                }
                throw new ThError('#maps.size Cannot get containsAllValues with non-collection type "' + ptc + '"');
            }
            throw new ThError('#maps.size Cannot get containsAllValues of non-map type "' + typeof target + '"');
        }
        throw new ThError("#maps.containsKey Cannot execute map containsAllValues: target is null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        size: size,
        isEmpty: isEmpty,
        containsKey: containsKey,
        containsValue: containsValue,
        containsAllKeys: containsAllKeys,
        containsAllValues: containsAllValues
    };
}();

var thMessagesObject = function() {
    var thExpressionObjectName = "#messages";
    function msg() {
        if (arguments !== null) {
            if (arguments.length > 0) {
                return msgWithParams(arguments[0], Array.prototype.slice.call(arguments, 1));
            }
            throw new ThError("#messages.msg Invoked with no arguments!");
        }
        throw new ThError("#messages.msg Target cannot be null");
    }
    function msgWithParams(target, params) {
        if (target !== null) {
            return thymol.getMessage(target, params, true);
        }
        throw new ThError("#messages.msgWithParams Target cannot be null");
    }
    function msgOrNull() {
        if (arguments !== null) {
            if (arguments.length > 0) {
                return msgOrNullWithParams(arguments[0], Array.prototype.slice.call(arguments, 1));
            }
            throw new ThError("#messages.msgOrNull Invoked with no arguments!");
        }
        throw new ThError("#messages.msgOrNull Target cannot be null");
    }
    function msgOrNullWithParams(target, params) {
        if (target !== null) {
            return thymol.getMessage(target, params, false);
        }
        throw new ThError("#messages.msgOrNullWithParams Target cannot be null");
    }
    function arrayMsg() {
        if (arguments !== null) {
            if (arguments.length > 0) {
                return arrayMsgWithParams(arguments[0], Array.prototype.slice.call(arguments, 1));
            }
            throw new ThError("#messages.arrayMsg Invoked with no arguments!");
        }
        throw new ThError("#messages.arrayMsg Target cannot be null");
    }
    function arrayMsgWithParams(target, params) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(msgWithParams(target[i], params));
            }
            return result;
        }
        throw new ThError("#messages.arrayMsgWithParams Target cannot be null");
    }
    function setMsg() {
        if (arguments !== null) {
            if (arguments.length > 0) {
                return setMsgWithParams(arguments[0], Array.prototype.slice.call(arguments, 1));
            }
            throw new ThError("#messages.setMsg Invoked with no arguments!");
        }
        throw new ThError("#messages.setMsg Target cannot be null");
    }
    function setMsgWithParams(target, params) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(msgWithParams(target[k], params));
                }
            }
            return result;
        }
        throw new ThError("#messages.setMsgWithParams Target cannot be null");
    }
    function arrayMsgOrNull() {
        if (arguments !== null) {
            if (arguments.length > 0) {
                return arrayMsgOrNullWithParams(arguments[0], Array.prototype.slice.call(arguments, 1));
            }
            throw new ThError("#messages.arrayMsgOrNull Invoked with no arguments!");
        }
        throw new ThError("#messages.arrayMsgOrNull Target cannot be null");
    }
    function arrayMsgOrNullWithParams(target, params) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(msgOrNullWithParams(target[i], params));
            }
            return result;
        }
        throw new ThError("#messages.arrayMsgOrNullWithParams Target cannot be null");
    }
    function setMsgOrNull() {
        if (arguments !== null) {
            if (arguments.length > 0) {
                return setMsgOrNullWithParams(arguments[0], Array.prototype.slice.call(arguments, 1));
            }
            throw new ThError("#messages.setMsgOrNull Invoked with no arguments!");
        }
        throw new ThError("#messages.setMsgOrNull Target cannot be null");
    }
    function setMsgOrNullWithParams(target, params) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(msgOrNullWithParams(target[k], params));
                }
            }
            return result;
        }
        throw new ThError("#messages.setMsgOrNullWithParams Target cannot be null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        msg: msg,
        msgWithParams: msgWithParams,
        msgOrNull: msgOrNull,
        msgOrNullWithParams: msgOrNullWithParams,
        arrayMsg: arrayMsg,
        listMsg: arrayMsg,
        setMsg: setMsg,
        arrayMsgWithParams: arrayMsgWithParams,
        listMsgWithParams: arrayMsgWithParams,
        setMsgWithParams: setMsgWithParams,
        arrayMsgOrNull: arrayMsgOrNull,
        listMsgOrNull: arrayMsgOrNull,
        setMsgOrNull: setMsgOrNull,
        arrayMsgOrNullWithParams: arrayMsgOrNullWithParams,
        listMsgOrNullWithParams: arrayMsgOrNullWithParams,
        setMsgOrNullWithParams: setMsgOrNullWithParams
    };
}();

var thNumbersObject = function() {
    var thExpressionObjectName = "#numbers";
    var DEFAULT_THOU_PT = ",";
    var DEFAULT_DECI_PT = ".";
    var DEFAULT_NONE_PT = "?";
    function formatDecimalProxy() {
        if (arguments !== null) {
            if (arguments.length > 4) {
                return formatDecimal5(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
            } else if (arguments.length > 3) {
                return formatDecimal4(arguments[0], arguments[1], arguments[2], arguments[3]);
            }
            return formatDecimal3(arguments[0], arguments[1], arguments[2]);
        }
    }
    function formatIntegerProxy() {
        if (arguments !== null) {
            if (arguments.length > 4) {
                return formatDecimal5(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
            } else if (arguments.length > 3) {
                return formatDecimal5(arguments[0], arguments[1], "NONE", arguments[2], arguments[3]);
            } else if (arguments.length > 2) {
                if (typeof arguments[2] === "string") {
                    return formatDecimal5(arguments[0], arguments[1], arguments[2], 0, "POINT");
                }
                return formatDecimal5(arguments[0], arguments[1], "NONE", arguments[2], "POINT");
            } else {
                return formatDecimal5(arguments[0], arguments[1], "NONE", 0, "POINT");
            }
        }
    }
    function arrayFormatIntegerProxy() {
        if (arguments !== null) {
            if (arguments.length > 2) {
                return arrayFormatDecimal(arguments[0], arguments[1], arguments[2], 0, "POINT");
            }
            return arrayFormatDecimal(arguments[0], arguments[1], "NONE", 0, "POINT");
        }
    }
    function setFormatIntegerProxy() {
        if (arguments !== null) {
            if (arguments.length > 2) {
                return setFormatDecimal(arguments[0], arguments[1], arguments[2], 0, "POINT");
            }
            return setFormatDecimal(arguments[0], arguments[1], "NONE", 0, "POINT");
        }
    }
    function arrayFormatDecimalProxy() {
        if (arguments !== null) {
            if (arguments.length > 4) {
                return arrayFormatDecimal(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
            } else if (arguments.length > 3) {
                return arrayFormatDecimal(arguments[0], arguments[1], "NONE", arguments[2], arguments[3]);
            }
            return arrayFormatDecimal(arguments[0], arguments[1], "NONE", arguments[2], "POINT");
        }
    }
    function setFormatDecimalProxy() {
        if (arguments !== null) {
            if (arguments.length > 4) {
                return setFormatDecimal(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
            } else if (arguments.length > 3) {
                return setFormatDecimal(arguments[0], arguments[1], "NONE", arguments[2], arguments[3]);
            }
            return setFormatDecimal(arguments[0], arguments[1], "NONE", arguments[2], "POINT");
        }
    }
    function sequenceProxy() {
        if (arguments !== null) {
            if (arguments.length > 2) {
                return sequence(arguments[0], arguments[1], arguments[2]);
            }
            return sequence(arguments[0], arguments[1], 1);
        }
    }
    function getIntegerDigits(val) {
        var s = val.toString();
        var digits = s.length;
        var dp = s.indexOf(".");
        if (dp > 0) {
            digits = dp;
        }
        return digits;
    }
    function formatDecimal3(target, minIntegerDigits, decimalDigits) {
        var result = target.toString();
        var value = new Number(target);
        value = value.toFixed(decimalDigits);
        if (minIntegerDigits > 0) {
            result = value;
            value = new Number(value);
            var a = Math.abs(value);
            if (a < Math.pow(10, minIntegerDigits)) {
                if (target < 0) {
                    result = result.substring(1);
                }
                var p = getIntegerDigits(a);
                var x = minIntegerDigits - p;
                if (x > 0) {
                    for (var i = 0; i < x; i++) {
                        result = "0" + result;
                    }
                }
                if (target < 0) {
                    result = "-" + result;
                }
            }
        } else {
            result = value.toString();
        }
        result = new String(result);
        result.precision = decimalDigits;
        return result;
    }
    function formatDecimal4(target, minIntegerDigits, decimalDigits, decimalPointType) {
        var result = formatDecimal3(target, minIntegerDigits, decimalDigits);
        var decimalPoint;
        if ("DEFAULT" === decimalPointType) {
            decimalPoint = DEFAULT_DECI_PT;
        } else if ("NONE" === decimalPointType) {
            decimalPoint = DEFAULT_NONE_PT;
        } else {
            decimalPoint = getPointType(decimalPointType);
        }
        if ("." !== decimalPoint) {
            result = result.replace(".", decimalPoint, "g");
        }
        return result;
    }
    function formatDecimal5(target, minIntegerDigits, thousandsPointType, decimalDigits, decimalPointType) {
        var result = target.toString();
        var decimalPoint;
        if ("DEFAULT" === decimalPointType) {
            decimalPoint = DEFAULT_DECI_PT;
        } else if ("NONE" === decimalPointType) {
            decimalPoint = DEFAULT_NONE_PT;
        } else {
            decimalPoint = getPointType(decimalPointType);
        }
        if ("" !== decimalPoint) {
            result = formatDecimal4(target, minIntegerDigits, decimalDigits, decimalPointType);
        } else {
            result = formatDecimal3(target, minIntegerDigits, decimalDigits);
        }
        var thousandsPoint;
        if ("DEFAULT" === thousandsPointType) {
            thousandsPoint = DEFAULT_THOU_PT;
        } else {
            thousandsPoint = getPointType(thousandsPointType);
        }
        if ("" !== thousandsPoint) {
            result = addThousandsPointType(result.toString(), decimalPoint, thousandsPoint);
        }
        return result;
    }
    function getPointType(type) {
        var result = ".";
        if ("COMMA" === type) {
            result = ",";
        } else if ("WHITESPACE" === type) {
            result = " ";
        } else if ("NONE" === type) {
            result = "";
        }
        return result;
    }
    function arrayFormatDecimal(target, minIntegerDigits, thousandsPointType, decimalDigits, decimalPointType) {
        var result = [];
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            result.push(formatDecimal5(target[i], minIntegerDigits, thousandsPointType, decimalDigits, decimalPointType));
        }
        return result;
    }
    function setFormatDecimal(target, minIntegerDigits, thousandsPointType, decimalDigits, decimalPointType) {
        var result = new ThSet();
        for (var k in target) {
            if (target.hasOwnProperty(k) && typeof target[k] !== "function") {
                result.add(formatDecimal5(target[k], minIntegerDigits, thousandsPointType, decimalDigits, decimalPointType));
            }
        }
        return result;
    }
    function addThousandsPointType(nStr, dpt, tpt) {
        var x = nStr.split(dpt);
        var x1 = x[0];
        var x2 = x.length > 1 ? dpt + x[1] : "";
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, "$1" + tpt + "$2");
        }
        return x1 + x2;
    }
    function sequence(start, stop, step) {
        var result = [];
        if (step > 0) {
            var value = start;
            if (start <= stop) {
                do {
                    result.push(value);
                    value += step;
                } while (value <= stop);
            } else {
                do {
                    result.push(value);
                    value -= step;
                } while (value >= stop);
            }
        }
        return result;
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        formatDecimal: formatDecimalProxy,
        formatInteger: formatIntegerProxy,
        arrayFormatInteger: arrayFormatIntegerProxy,
        arrayFormatDecimal: arrayFormatDecimalProxy,
        listFormatInteger: arrayFormatIntegerProxy,
        listFormatDecimal: arrayFormatDecimalProxy,
        setFormatInteger: setFormatIntegerProxy,
        setFormatDecimal: setFormatDecimalProxy,
        sequence: sequenceProxy
    };
}();

var thObjectsObject = function() {
    var thExpressionObjectName = "#objects";
    function nullSafe(target, defaultValue) {
        return target != null ? target : defaultValue;
    }
    function arrayNullSafe(target, defaultValue) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(nullSafe(target[i], defaultValue));
            }
            return result;
        }
        throw new ThError("#objects.arrayNullSafe Target cannot be null");
    }
    function setNullSafe(target, defaultValue) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(nullSafe(target[k], defaultValue));
                }
            }
            return result;
        }
        throw new ThError("#objects.setNullSafe Target cannot be null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        nullSafe: nullSafe,
        arrayNullSafe: arrayNullSafe,
        listNullSafe: arrayNullSafe,
        setNullSafe: setNullSafe
    };
}();

var thSetsObject = function() {
    var thExpressionObjectName = "#sets";
    function toSet(target) {
        if (target !== null) {
            var tt = typeof target;
            var ptc = Object.prototype.toString.call(target);
            var result;
            if (tt === "ThSet") {
                result = target;
            }
            if (tt === "Array" || ptc === "[object Array]") {
                result = ThSet.prototype.fromArray(target);
            } else if (tt === "object") {
                result = new ThSet();
                for (var k in target) {
                    var value = target[k];
                    var process = false;
                    if (value !== null) {
                        if (target instanceof ThSet) {
                            process = target.isContent(k);
                        } else {
                            process = target.hasOwnProperty(k) && typeof value !== "function";
                        }
                    }
                    if (process) {
                        result.add(value);
                    }
                }
            } else {
                throw new ThError('#sets.toSet Cannot convert object of type "' + tt + '" to a set');
            }
            return result;
        }
        throw new ThError("#sets.toSet Cannot convert null to set");
    }
    function size(target) {
        if (target !== null) {
            if (target instanceof ThSet) {
                return target.size();
            }
            throw new ThError('#sets.size Cannot get size of non-set type "' + typeof target + '"');
        }
        throw new ThError("#sets.size Cannot get size of null");
    }
    function isEmpty(target) {
        if (target !== null) {
            if (target instanceof ThSet) {
                return target.isEmpty();
            }
            throw new ThError('#sets.size Cannot get isEmpty of non-set type "' + typeof target + '"');
        }
        throw new ThError("#sets.size Cannot get isEmpty of null");
    }
    function contains(target, element) {
        if (target !== null) {
            for (var k in target) {
                if (target.isContent(k)) {
                    if (target[k] === null) {
                        if (element === null) {
                            return true;
                        }
                    } else if (element !== null && target[k] === element) {
                        return true;
                    }
                }
            }
            return false;
        }
        throw new ThError("#sets.contains Cannot execute sets contains: target is null");
    }
    function containsAll(target, elements) {
        if (target !== null) {
            if (elements !== null) {
                var elementsArray;
                if (elements instanceof Array) {
                    elementsArray = [].concat(elements);
                } else {
                    if (elements instanceof ThSet) {
                        elementsArray = elements.toArray();
                    } else {
                        elementsArray = [];
                        for (var k in elements) {
                            if (elements.hasOwnProperty(k) && typeof elements[k] !== "function") {
                                elementsArray.push(elements[k]);
                            }
                        }
                    }
                }
                for (var k in target) {
                    if (target.isContent(k)) {
                        for (var j = 0, jLimit = elementsArray.length; j < jLimit; j++) {
                            if (target[k] === elementsArray[j]) {
                                elementsArray.splice(j, 1);
                            }
                        }
                    }
                }
                return elementsArray.length === 0;
            }
            throw new ThError("#sets.containsAll Cannot execute sets containsAll: elements is null");
        }
        throw new ThError("#sets.containsAll Cannot execute sets containsAll: target is null");
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        toSet: toSet,
        size: size,
        isEmpty: isEmpty,
        contains: contains,
        containsAll: containsAll
    };
}();

var thStringsObject = function() {
    var thExpressionObjectName = "#strings";
    function toString(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = target.toString();
        }
        return result;
    }
    function arrayToString(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(target[i].toString());
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setToString(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(toString(target[k]));
                }
            }
        }
        return result;
    }
    function abbreviate(target, maxSize, source) {
        if (maxSize >= 3) {
            var result = null;
            if (target !== null && typeof target !== "undefined") {
                result = target.toString();
                if (result.length > maxSize) {
                    result = result.substring(0, maxSize - 3) + "...";
                }
            }
            return result;
        }
        throwAbbreviateException("abbreviate", maxSize);
    }
    function arrayAbbreviate(target, maxSize) {
        if (maxSize >= 3) {
            var result = null;
            if (target !== null && typeof target !== "undefined") {
                result = [];
                for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                    result.push(abbreviate(target[i], maxSize));
                }
            }
            return result;
        }
        throwAbbreviateException("arrayAbbreviate", maxSize);
    }
    function setAbbreviate(target, maxSize) {
        if (maxSize >= 3) {
            var result = null;
            if (target !== null && typeof target !== "undefined") {
                result = new ThSet();
                for (var k in target) {
                    if (target.isContent(k)) {
                        result.add(abbreviate(target[k], maxSize));
                    }
                }
            }
            return result;
        }
        throwAbbreviateException("setAbbreviate", maxSize);
    }
    function throwAbbreviateException(source, maxSize) {
        throw new ThError("#strings." + source + ' Maximum size must be greater than or equal to 3 but was: "' + maxSize + '"');
    }
    function equals(o1, o2) {
        if (o1 === null) {
            return o2 === null;
        } else if (o2 !== null) {
            return o1.toString() === o2.toString();
        }
        return false;
    }
    function equalsIgnoreCase(o1, o2) {
        if (o1 === null) {
            return o2 === null;
        } else if (o2 !== null) {
            return o1.toString().toLowerCase() === o2.toString().toLowerCase();
        }
        return false;
    }
    function contains(target, fragment) {
        if (target !== null) {
            if (fragment !== null) {
                return target.toString().indexOf(fragment) >= 0;
            }
            throw new ThError("#strings.contains Fragment cannot be null");
        }
        throw new ThError("#strings.contains Cannot apply contains on null");
    }
    function arrayContains(target, fragment) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(contains(target[i], fragment));
            }
            return result;
        }
        throw new ThError("#strings.arrayContains Cannot apply arrayContains on null");
    }
    function setContains(target, fragment) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(contains(target[k], fragment));
                }
            }
            return result;
        }
        throw new ThError("#strings.setContains Cannot apply setContains on null");
    }
    function containsIgnoreCase(target, fragment) {
        if (target !== null) {
            if (fragment !== null) {
                return target.toString().toLowerCase().indexOf(fragment.toLowerCase()) >= 0;
            }
            throw new ThError("#strings.containsIgnoreCase Fragment cannot be null");
        }
        throw new ThError("#strings.containsIgnoreCase Cannot apply containsIgnoreCase on null");
    }
    function arrayContainsIgnoreCase(target, fragment) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(containsIgnoreCase(target[i], fragment));
            }
            return result;
        }
        throw new ThError("#strings.arrayContainsIgnoreCase Cannot apply arrayContainsIgnoreCase on null");
    }
    function setContainsIgnoreCase(target, fragment) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(containsIgnoreCase(target[k], fragment));
                }
            }
            return result;
        }
        throw new ThError("#strings.setContainsIgnoreCase Cannot apply setContainsIgnoreCase on null");
    }
    function startsWith(target, prefix) {
        if (target !== null) {
            if (prefix !== null) {
                return target.toString().indexOf(prefix) === 0;
            }
            throw new ThError("#strings.startsWith Prefix cannot be null");
        }
        throw new ThError("#strings.startsWith Cannot apply startsWith on null");
    }
    function arrayStartsWith(target, prefix) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(startsWith(target[i], prefix));
            }
            return result;
        }
        throw new ThError("#strings.arrayStartsWith Target cannot be null");
    }
    function setStartsWith(target, prefix) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(startsWith(target[k], prefix));
                }
            }
            return result;
        }
        throw new ThError("#strings.setStartsWith Target cannot be null");
    }
    function endsWith(target, suffix) {
        if (target !== null) {
            if (suffix !== null) {
                var str = target.toString();
                return str.indexOf(suffix) === str.length - suffix.length;
            }
            throw new ThError("#strings.startsWith Suffix cannot be null");
        }
        throw new ThError("#strings.endsWith Cannot apply endsWith on null");
    }
    function arrayEndsWith(target, suffix) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(endsWith(target[i], suffix));
            }
            return result;
        }
        throw new ThError("#strings.arrayEndsWith Target cannot be null");
    }
    function setEndsWith(target, suffix) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(endsWith(target[k], suffix));
                }
            }
            return result;
        }
        throw new ThError("#strings.setEndsWith Target cannot be null");
    }
    function substring(target, start, end) {
        if (target !== null) {
            return target.toString().substring(start, end);
        }
        throw new ThError("#strings.substring Target cannot be null");
    }
    function arraySubstring(target, start, end) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(substring(target[i], start, end));
            }
            return result;
        }
        throw new ThError("#strings.arraySubstring Target cannot be null");
    }
    function setSubstring(target, start, end) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(substring(target[k], start, end));
                }
            }
            return result;
        }
        throw new ThError("#strings.setSubstring Target cannot be null");
    }
    function substringAfter(target, substr) {
        if (target !== null) {
            if (substr !== null) {
                var str = target.toString();
                var indx = str.indexOf(substr);
                if (indx < 0) {
                    return null;
                }
                return str.substring(indx + substr.length);
            }
            throw new ThError("#strings.substringAfter Parameter substring cannot be null");
        }
        throw new ThError("#strings.substringAfter Cannot apply substringAfter on null");
    }
    function arraySubstringAfter(target, substr) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(substringAfter(target[i], substr));
            }
            return result;
        }
        throw new ThError("#strings.arraySubstringAfter Cannot apply arraySubstringAfter on null");
    }
    function setSubstringAfter(target, substr) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(substringAfter(target[k], substr));
                }
            }
            return result;
        }
        throw new ThError("#strings.setSubstringAfter Cannot apply setSubstringAfter on null");
    }
    function substringBefore(target, substr) {
        if (target !== null) {
            if (substr !== null) {
                var str = target.toString();
                var indx = str.indexOf(substr);
                if (indx < 0) {
                    return null;
                }
                return str.substring(0, indx);
            }
            throw new ThError("#strings.substringBefore Parameter substring cannot be null");
        }
        throw new ThError("#strings.substringBefore Cannot apply substringBefore on null");
    }
    function arraySubstringBefore(target, substr) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(substringBefore(target[i], substr));
            }
            return result;
        }
        throw new ThError("#strings.arraySubstringBefore Cannot apply arraySubstringBefore on null");
    }
    function setSubstringBefore(target, substr) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(substringBefore(target[k], substr));
                }
            }
            return result;
        }
        throw new ThError("#strings.setSubstringBefore Cannot apply setSubstringBefore on null");
    }
    function prepend(target, prefix) {
        if (target !== null) {
            if (prefix !== null) {
                return prefix.toString() + target.toString();
            }
            throw new ThError("#strings.prepend Prefix cannot be null");
        }
        throw new ThError("#strings.prepend Cannot apply prepend on null");
    }
    function arrayPrepend(target, prefix) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(prepend(target[i], prefix));
            }
            return result;
        }
        throw new ThError("#strings.arrayPrepend Cannot apply arrayPrepend on null");
    }
    function setPrepend(target, prefix) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(prepend(target[k], prefix));
                }
            }
            return result;
        }
        throw new ThError("#strings.setPrepend Cannot apply setPrepend on null");
    }
    function repeat(target, times) {
        var result = "";
        for (var i = 0; i < times; i++) {
            result += target.toString();
        }
        return result;
    }
    function append(target, suffix) {
        if (target !== null) {
            if (suffix !== null) {
                return target.toString() + suffix.toString();
            }
            throw new ThError("#strings.append Suffix cannot be null");
        }
        throw new ThError("#strings.append Cannot apply append on null");
    }
    function concat() {
        var result = "";
        for (var i = 0, iLimit = arguments.length; i < iLimit; i++) {
            if (arguments[i] !== null) {
                result += arguments[i];
            }
        }
        return result;
    }
    function concatReplaceNulls() {
        var result = "";
        for (var i = 1, iLimit = arguments.length; i < iLimit; i++) {
            if (arguments[i] === null) {
                result += arguments[0];
            } else {
                result += arguments[i];
            }
        }
        return result;
    }
    function arrayAppend(target, suffix) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(append(target[i], suffix));
            }
            return result;
        }
        throw new ThError("#strings.arrayAppend Target cannot be null");
    }
    function setAppend(target, suffix) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(append(target[k], suffix));
                }
            }
            return result;
        }
        throw new ThError("#strings.setAppend Target cannot be null");
    }
    function indexOf(target, fragment) {
        if (target !== null) {
            if (fragment !== null) {
                var str = target.toString();
                var indx = str.indexOf(fragment);
                return indx;
            }
            throw new ThError("#strings.indexOf Fragment cannot be null");
        }
        throw new ThError("#strings.indexOf Cannot apply indexOf on null");
    }
    function arrayIndexOf(target, fragment) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(indexOf(target[i], fragment));
            }
            return result;
        }
        throw new ThError("#strings.arrayIndexOf Cannot apply arrayIndexOf on null");
    }
    function setIndexOf(target, fragment) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(indexOf(target[k], fragment));
                }
            }
            return result;
        }
        throw new ThError("#strings.setIndexOf Cannot apply setIndexOf on null");
    }
    function isEmpty(target) {
        if (target !== null) {
            var str = target.toString();
            if (str !== null) {
                str = str.replace(/(?:[\\]t)/g, "	").replace(/(?:[\\]n)/g, "\n").replace(/(?:[\\]v)/g, "").replace(/(?:[\\]f)/g, "\f").replace(/(?:[\\]r)/g, "\r");
                str = str.trim();
                if (str.length !== 0) {
                    return false;
                }
            }
        }
        return true;
    }
    function arrayIsEmpty(target) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(isEmpty(target[i]));
            }
            return result;
        }
        throw new ThError("#strings.arrayIsEmpty Target cannot be null");
    }
    function setIsEmpty(target) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(isEmpty(target[k]));
                }
            }
            return result;
        }
        throw new ThError("#strings.setIsEmpty Target cannot be null");
    }
    function arrayJoin(stringArray, separator) {
        if (stringArray !== null) {
            if (separator !== null) {
                var sepStr = separator.toString();
                var result = "";
                for (var i = 0, iLimit = stringArray.length; i < iLimit; i++) {
                    if ("" !== result) {
                        result += sepStr;
                    }
                    result += stringArray[i];
                }
                return result;
            }
            throw new ThError("#strings.arrayJoin Separator cannot be null");
        }
        throw new ThError("#strings.arrayJoin Cannot apply join on null");
    }
    function setJoin(stringSet, separator) {
        if (stringSet !== null) {
            if (separator !== null) {
                var sepStr = separator.toString();
                var result = "";
                for (var k in stringSet) {
                    if (stringSet.isContent(k)) {
                        if ("" !== result) {
                            result += sepStr;
                        }
                        result += stringSet[k];
                    }
                }
                return result;
            }
            throw new ThError("#strings.setJoin Separator cannot be null");
        }
        throw new ThError("#strings.setJoin Cannot apply join on null");
    }
    function doRegExpify(target, flags) {
        var result = target.toString();
        result = result.replace(/[\\]/g, "\\").replace(/[\^]/g, "^").replace(/[\[]/g, "[").replace(/[\]]/g, "]").replace(/[\(]/g, "(").replace(/[\)]/g, ")");
        result = "[" + result + "]";
        return new RegExp(result, flags);
    }
    function doSplit(target, separator) {
        var re = doRegExpify(separator);
        var splits = target.split(re);
        var result = [];
        for (var i = 0, iLimit = splits.length; i < iLimit; i++) {
            if (splits[i]) {
                result.push(splits[i]);
            }
        }
        return result;
    }
    function arraySplit(target, separator) {
        if (target !== null) {
            if (separator !== null) {
                return doSplit(target, separator);
            }
            throw new ThError("#strings.arraySplit Separator cannot be null");
        }
        throw new ThError("#strings.arraySplit Cannot apply split on null");
    }
    function setSplit(target, separator) {
        if (target !== null) {
            if (separator !== null) {
                var result = new ThSet();
                var splits = doSplit(target, separator);
                for (var i = 0, iLimit = splits.length; i < iLimit; i++) {
                    result.add(splits[i]);
                }
                return result;
            }
            throw new ThError("#strings.setSplit Separator cannot be null");
        }
        throw new ThError("#strings.setSplit Cannot apply split on null");
    }
    function length(target) {
        if (target !== null) {
            return target.toString().length;
        }
        throw new ThError("#strings.length Cannot apply length on null");
    }
    function arrayLength(target) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(length(target[i]));
            }
            return result;
        }
        throw new ThError("#strings.arrayLength Target cannot be null");
    }
    function setLength(target) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(length(target[k]));
                }
            }
            return result;
        }
        throw new ThError("#strings.setLength Target cannot be null");
    }
    function replace(target, before, after) {
        if (target !== null) {
            if (before !== null) {
                if (after !== null) {
                    var re = doRegExpify(before, "g");
                    return target.replace(re, after);
                }
                throw new ThError("#strings.replace After cannot be null");
            }
            throw new ThError("#strings.replace Before cannot be null");
        }
        throw new ThError("#strings.replace Cannot apply replace on null");
    }
    function arrayReplace(target, before, after) {
        if (target !== null) {
            if (before !== null) {
                if (after !== null) {
                    var re = doRegExpify(before, "g");
                    var result = [];
                    for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                        result.push(target[i].toString().replace(re, after));
                    }
                    return result;
                }
                throw new ThError("#strings.arrayReplace After cannot be null");
            }
            throw new ThError("#strings.arrayReplace Before cannot be null");
        }
        throw new ThError("#strings.arrayReplace Cannot apply replace on null");
    }
    function setReplace(target, before, after) {
        if (target !== null) {
            if (before !== null) {
                if (after !== null) {
                    var re = doRegExpify(before, "g");
                    var result = new ThSet();
                    for (var k in target) {
                        if (target.isContent(k)) {
                            result.add(target[k].toString().replace(re, after));
                        }
                    }
                    return result;
                }
                throw new ThError("#strings.setReplace Array of 'after' values cannot be null");
            }
            throw new ThError("#strings.setReplace Array of 'before' values cannot be null");
        }
        throw new ThError("#strings.setReplace Cannot apply replace on null");
    }
    function multipleReplace(target, before, after) {
        if (target !== null) {
            if (before !== null) {
                if (Object.prototype.toString.call(before) == "[object Array]") {
                    if (after !== null) {
                        if (Object.prototype.toString.call(after) == "[object Array]") {
                            if (before.length === after.length) {
                                var result = target;
                                for (var i = 0, iLimit = before.length; i < iLimit; i++) {
                                    var re = doRegExpify(before[i], "g");
                                    result = result.replace(re, after[i]);
                                }
                                return result;
                            }
                            throw new ThError("#strings.multipleReplace Arrays of 'before' and 'after' values must have the same length");
                        }
                        throw new ThError("#strings.multipleReplace After must be an array type");
                    }
                    throw new ThError("#strings.multipleReplace After cannot be null");
                }
                throw new ThError("#strings.multipleReplace Before must be an array type");
            }
            throw new ThError("#strings.multipleReplace Before cannot be null");
        }
        throw new ThError("#strings.multipleReplace Target cannot be null");
    }
    function arrayMultipleReplace(target, before, after) {
        if (target !== null) {
            var result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                result.push(multipleReplace(target[i].toString(), before, after));
            }
            return result;
        }
        throw new ThError("#strings.arrayMultipleReplace Target cannot be null");
    }
    function setMultipleReplace(target, before, after) {
        if (target !== null) {
            var result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(multipleReplace(target[k].toString(), before, after));
                }
            }
            return result;
        }
        throw new ThError("#strings.setMultipleReplace Target cannot be null");
    }
    function toUpperCase(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = target.toString().toUpperCase();
        }
        return result;
    }
    function arrayToUpperCase(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(target[i].toString().toUpperCase());
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setToUpperCase(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(target[k].toString().toUpperCase());
                }
            }
        }
        return result;
    }
    function toLowerCase(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = target.toString().toLowerCase();
        }
        return result;
    }
    function arrayToLowerCase(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(target[i].toString().toLowerCase());
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setToLowerCase(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(target[k].toString().toLowerCase());
                }
            }
        }
        return result;
    }
    function trim(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = target.toString().trim();
        }
        return result;
    }
    function arrayTrim(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(target[i].toString().trim());
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setTrim(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(target[k].toString().trim());
                }
            }
        }
        return result;
    }
    function capitalize(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = target.toString();
            if (result.length > 0) {
                result = result.charAt(0).toUpperCase() + result.substr(1);
            }
        }
        return result;
    }
    function arrayCapitalize(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(capitalize(target[i]));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setCapitalize(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(capitalize(target[k]));
                }
            }
        }
        return result;
    }
    function unCapitalize(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = target.toString();
            if (result.length > 0) {
                result = result.charAt(0).toLowerCase() + result.substr(1);
            }
        }
        return result;
    }
    function arrayUnCapitalize(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(unCapitalize(target[i]));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setUnCapitalize(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(unCapitalize(target[k]));
                }
            }
        }
        return result;
    }
    function capitalizeWords(target, delimiters) {
        var splitter;
        if (typeof delimiters === "undefined") {
            splitter = new RegExp("[^ 	\r\n\f]\\w*", "g");
        } else {
            var spec = "[^ " + delimiters + "]\\w*";
            splitter = new RegExp(spec, "g");
        }
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            var str = target.toString();
            if (str.length > 0) {
                result = "";
                var matched;
                var indx = 0;
                while ((matched = splitter.exec(str)) !== null) {
                    result += str.substring(indx, matched.index);
                    result += matched[0].charAt(0).toUpperCase() + matched[0].substr(1);
                    indx = splitter.lastIndex;
                }
                result += str.substring(indx);
            }
        }
        return result;
    }
    function arrayCapitalizeWords(target, delimiters) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(capitalizeWords(target[i], delimiters));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setCapitalizeWords(target, delimiters) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(capitalizeWords(target[k], delimiters));
                }
            }
        }
        return result;
    }
    function escapeXml(target, escapeQuotesParam) {
        var result = target;
        if (target !== null && typeof target !== "undefined") {
            var escapeQuotes = escapeQuotesParam !== null && typeof escapeQuotesParam !== "undefined" && escapeQuotesParam;
            result = "";
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                var c = target.charAt(i);
                if (c === "&") {
                    if (!isEntityStart(target, i)) {
                        c = "&amp;";
                    }
                } else if (c === "<") {
                    c = "&lt;";
                } else if (c === ">") {
                    c = "&gt;";
                } else if (escapeQuotes) {
                    if (c === '"') {
                        c = "&quot;";
                    } else if (c === "'") {
                        c = "&#39;";
                    }
                }
                result += c;
            }
        }
        return result;
    }
    function isEntityStart(buffer, position) {
        var i = position + 1;
        while (i < buffer.length) {
            var c = buffer[i];
            if (!(c >= "A" && c <= "Z" || c >= "a" && c <= "z" || c >= "0" && c <= "9" || c == ";")) {
                return false;
            }
            if (c == ";") {
                return true;
            }
            i++;
        }
        return false;
    }
    function arrayEscapeXml(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(escapeXml(target[i], false));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setEscapeXml(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(escapeXml(target[k], false));
                }
            }
        }
        return result;
    }
    function escapeJavaScript(target) {
        var result = target;
        if (target !== null && typeof target !== "undefined") {
            result = escapeJavaAny(target, true);
        }
        return result;
    }
    function escapeJavaAny(target, javaScript) {
        var result = "";
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            var c = target.charAt(i);
            var cc = target.charCodeAt(i);
            if (cc >= 32 && cc <= 127) {
                switch (c) {
                  case "\\":
                    c = "\\";
                    break;

                  case '"':
                    c = '\\"';
                    break;

                  case "'":
                    if (javaScript) {
                        c = "\\'";
                    }
                    break;

                  case "/":
                    if (javaScript) {
                        if (i > 0 && target.charAt(i - 1) == "<") {
                            c = "\\/";
                        }
                    }
                    break;

                  case ">":
                    if (javaScript && i > 1) {
                        if (target.charAt(i - 1) == "]" && target.charAt(i - 2) == "]") {
                            c = "\\>";
                        }
                    }
                    break;

                  default:
                    break;
                }
            } else {
                switch (c) {
                  case "	":
                    c = "\\t";
                    break;

                  case "\n":
                    c = "\\n";
                    break;

                  case "\b":
                    c = "\\b";
                    break;

                  case "\f":
                    c = "\\f";
                    break;

                  case "\r":
                    c = "\\r";
                    break;

                  default:
                    c = unicodeEscape(cc);
                    break;
                }
            }
            result += c;
        }
        return result;
    }
    function unicodeEscape(c) {
        var x = c + 65536;
        x = x.toString(16);
        x = x.slice(1);
        var output = "\\u" + x.toUpperCase();
        return output;
    }
    function arrayEscapeJavaScript(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(escapeJavaScript(target[i]));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setEscapeJavaScript(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(escapeJavaScript(target[k]));
                }
            }
        }
        return result;
    }
    function unescapeJavaScript(target) {
        var result = target;
        if (target !== null && typeof target !== "undefined") {
            result = unescapeJavaAny(target);
        }
        return result;
    }
    function unescapeJavaAny(target) {
        var result = "";
        var unicodeSpec = "";
        var unicodeLen = -1;
        var lastWasEscape = false;
        for (var i = 0, iLimit = target.length; i < iLimit; i++) {
            var c = target.charAt(i);
            if (unicodeLen >= 0) {
                unicodeSpec += c;
                if (c >= "0" && c <= "9" || c >= "A" && c <= "F" || c >= "a" && c <= "f") {
                    unicodeLen++;
                    if (unicodeLen > 3) {
                        var cc = parseInt(unicodeSpec, 16);
                        c = String.fromCharCode(cc);
                        unicodeSpec = "";
                        unicodeLen = -1;
                        result += c;
                        lastWasEscape = false;
                    }
                } else {
                    throw new ThError('#strings unescape cannot process Unicode constant: "\\u' + unicodeSpec + '"');
                }
            } else if (lastWasEscape) {
                if (c === "u") {
                    unicodeLen = 0;
                } else {
                    switch (c) {
                      case "t":
                        c = "	";
                        break;

                      case "n":
                        c = "\n";
                        break;

                      case "b":
                        c = "\b";
                        break;

                      case "f":
                        c = "\f";
                        break;

                      case "r":
                        c = "\r";
                        break;

                      default:
                        break;
                    }
                    result += c;
                    lastWasEscape = false;
                }
            } else if (c == "\\") {
                lastWasEscape = true;
            } else {
                result += c;
                lastWasEscape = false;
            }
        }
        if (unicodeLen >= 0) {
            result += "\\u" + unicodeSpec;
        } else if (lastWasEscape) {
            result += "\\";
        }
        return result;
    }
    function arrayUnescapeJavaScript(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(unescapeJavaScript(target[i]));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setUnescapeJavaScript(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(unescapeJavaScript(target[k]));
                }
            }
        }
        return result;
    }
    function escapeJava(target) {
        var result = target;
        if (target !== null && typeof target !== "undefined") {
            result = escapeJavaAny(target, false);
        }
        return result;
    }
    function arrayEscapeJava(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = [];
            for (var i = 0, iLimit = target.length; i < iLimit; i++) {
                if (target[i] !== null) {
                    result.push(escapeJava(target[i]));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }
    function setEscapeJava(target) {
        var result = null;
        if (target !== null && typeof target !== "undefined") {
            result = new ThSet();
            for (var k in target) {
                if (target.isContent(k)) {
                    result.add(escapeJava(target[k]));
                }
            }
        }
        return result;
    }
    var ALPHA_NUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    function randomAlphanumeric(count) {
        var result = "";
        for (var i = 0; i < count; i++) {
            result += ALPHA_NUMERIC.charAt(Math.floor(Math.random() * ALPHA_NUMERIC.length));
        }
        return result;
    }
    return {
        thExpressionObjectName: thExpressionObjectName,
        toString: toString,
        arrayToString: arrayToString,
        listToString: arrayToString,
        setToString: setToString,
        abbreviate: abbreviate,
        arrayAbbreviate: arrayAbbreviate,
        listAbbreviate: arrayAbbreviate,
        setAbbreviate: setAbbreviate,
        equals: equals,
        equalsIgnoreCase: equalsIgnoreCase,
        contains: contains,
        arrayContains: arrayContains,
        listContains: arrayContains,
        setContains: setContains,
        containsIgnoreCase: containsIgnoreCase,
        arrayContainsIgnoreCase: arrayContainsIgnoreCase,
        listContainsIgnoreCase: arrayContainsIgnoreCase,
        setContainsIgnoreCase: setContainsIgnoreCase,
        startsWith: startsWith,
        arrayStartsWith: arrayStartsWith,
        listStartsWith: arrayStartsWith,
        setStartsWith: setStartsWith,
        endsWith: endsWith,
        arrayEndsWith: arrayEndsWith,
        listEndsWith: arrayEndsWith,
        setEndsWith: setEndsWith,
        substring: substring,
        arraySubstring: arraySubstring,
        listSubstring: arraySubstring,
        setSubstring: setSubstring,
        substringAfter: substringAfter,
        arraySubstringAfter: arraySubstringAfter,
        listSubstringAfter: arraySubstringAfter,
        setSubstringAfter: setSubstringAfter,
        substringBefore: substringBefore,
        arraySubstringBefore: arraySubstringBefore,
        listSubstringBefore: arraySubstringBefore,
        setSubstringBefore: setSubstringBefore,
        prepend: prepend,
        arrayPrepend: arrayPrepend,
        listPrepend: arrayPrepend,
        setPrepend: setPrepend,
        repeat: repeat,
        append: append,
        concat: concat,
        concatReplaceNulls: concatReplaceNulls,
        arrayAppend: arrayAppend,
        listAppend: arrayAppend,
        setAppend: setAppend,
        indexOf: indexOf,
        arrayIndexOf: arrayIndexOf,
        listIndexOf: arrayIndexOf,
        setIndexOf: setIndexOf,
        isEmpty: isEmpty,
        arrayIsEmpty: arrayIsEmpty,
        listIsEmpty: arrayIsEmpty,
        setIsEmpty: setIsEmpty,
        arrayJoin: arrayJoin,
        listJoin: arrayJoin,
        setJoin: setJoin,
        arraySplit: arraySplit,
        listSplit: arraySplit,
        setSplit: setSplit,
        length: length,
        arrayLength: arrayLength,
        listLength: arrayLength,
        setLength: setLength,
        replace: replace,
        arrayReplace: arrayReplace,
        listReplace: arrayReplace,
        setReplace: setReplace,
        multipleReplace: multipleReplace,
        arrayMultipleReplace: arrayMultipleReplace,
        listMultipleReplace: arrayMultipleReplace,
        setMultipleReplace: setMultipleReplace,
        toUpperCase: toUpperCase,
        arrayToUpperCase: arrayToUpperCase,
        listToUpperCase: arrayToUpperCase,
        setToUpperCase: setToUpperCase,
        toLowerCase: toLowerCase,
        arrayToLowerCase: arrayToLowerCase,
        listToLowerCase: arrayToLowerCase,
        setToLowerCase: setToLowerCase,
        trim: trim,
        arrayTrim: arrayTrim,
        listTrim: arrayTrim,
        setTrim: setTrim,
        capitalize: capitalize,
        arrayCapitalize: arrayCapitalize,
        listCapitalize: arrayCapitalize,
        setCapitalize: setCapitalize,
        unCapitalize: unCapitalize,
        arrayUnCapitalize: arrayUnCapitalize,
        listUnCapitalize: arrayUnCapitalize,
        setUnCapitalize: setUnCapitalize,
        capitalizeWords: capitalizeWords,
        arrayCapitalizeWords: arrayCapitalizeWords,
        listCapitalizeWords: arrayCapitalizeWords,
        setCapitalizeWords: setCapitalizeWords,
        escapeXml: escapeXml,
        arrayEscapeXml: arrayEscapeXml,
        listEscapeXml: arrayEscapeXml,
        setEscapeXml: setEscapeXml,
        escapeJavaScript: escapeJavaScript,
        arrayEscapeJavaScript: arrayEscapeJavaScript,
        listEscapeJavaScript: arrayEscapeJavaScript,
        setEscapeJavaScript: setEscapeJavaScript,
        unescapeJavaScript: unescapeJavaScript,
        arrayUnescapeJavaScript: arrayUnescapeJavaScript,
        listUnescapeJavaScript: arrayUnescapeJavaScript,
        setUnescapeJavaScript: setUnescapeJavaScript,
        escapeJava: escapeJava,
        arrayEscapeJava: arrayEscapeJava,
        listEscapeJava: arrayEscapeJava,
        setEscapeJava: setEscapeJava,
        unescapeJava: unescapeJavaScript,
        arrayUnescapeJava: arrayUnescapeJavaScript,
        listUnescapeJava: arrayUnescapeJavaScript,
        setUnescapeJava: setUnescapeJavaScript,
        randomAlphanumeric: randomAlphanumeric
    };
}();

thObjectsConfigureModules = function() {
    thymol.configureModule(thAggregatesObject);
    thymol.configureModule(thArraysObject);
    thymol.configureModule(thBoolsObject);
    thymol.configureModule(thDatesObject);
    thymol.configureModule(thCalendarsObject);
    thymol.configureModule(thIdsObject);
    thymol.configureModule(thListsObject);
    thymol.configureModule(thMapsObject);
    thymol.configureModule(thMessagesObject);
    thymol.configureModule(thNumbersObject);
    thymol.configureModule(thObjectsObject);
    thymol.configureModule(thSetsObject);
    thymol.configureModule(thStringsObject);
};