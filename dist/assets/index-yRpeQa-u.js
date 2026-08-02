(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function r(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=r(l);fetch(l.href,o)}})();function zf(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var qu={exports:{}},H={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Vn=Symbol.for("react.element"),Ff=Symbol.for("react.portal"),Df=Symbol.for("react.fragment"),Mf=Symbol.for("react.strict_mode"),Of=Symbol.for("react.profiler"),Bf=Symbol.for("react.provider"),Af=Symbol.for("react.context"),Hf=Symbol.for("react.forward_ref"),jf=Symbol.for("react.suspense"),Uf=Symbol.for("react.memo"),Wf=Symbol.for("react.lazy"),Ds=Symbol.iterator;function $f(e){return e===null||typeof e!="object"?null:(e=Ds&&e[Ds]||e["@@iterator"],typeof e=="function"?e:null)}var ec={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},tc=Object.assign,rc={};function Xr(e,t,r){this.props=e,this.context=t,this.refs=rc,this.updater=r||ec}Xr.prototype.isReactComponent={};Xr.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Xr.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function nc(){}nc.prototype=Xr.prototype;function pi(e,t,r){this.props=e,this.context=t,this.refs=rc,this.updater=r||ec}var mi=pi.prototype=new nc;mi.constructor=pi;tc(mi,Xr.prototype);mi.isPureReactComponent=!0;var Ms=Array.isArray,lc=Object.prototype.hasOwnProperty,gi={current:null},oc={key:!0,ref:!0,__self:!0,__source:!0};function ac(e,t,r){var n,l={},o=null,a=null;if(t!=null)for(n in t.ref!==void 0&&(a=t.ref),t.key!==void 0&&(o=""+t.key),t)lc.call(t,n)&&!oc.hasOwnProperty(n)&&(l[n]=t[n]);var i=arguments.length-2;if(i===1)l.children=r;else if(1<i){for(var s=Array(i),c=0;c<i;c++)s[c]=arguments[c+2];l.children=s}if(e&&e.defaultProps)for(n in i=e.defaultProps,i)l[n]===void 0&&(l[n]=i[n]);return{$$typeof:Vn,type:e,key:o,ref:a,props:l,_owner:gi.current}}function Vf(e,t){return{$$typeof:Vn,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function hi(e){return typeof e=="object"&&e!==null&&e.$$typeof===Vn}function Gf(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(r){return t[r]})}var Os=/\/+/g;function Vo(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Gf(""+e.key):t.toString(36)}function El(e,t,r,n,l){var o=typeof e;(o==="undefined"||o==="boolean")&&(e=null);var a=!1;if(e===null)a=!0;else switch(o){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case Vn:case Ff:a=!0}}if(a)return a=e,l=l(a),e=n===""?"."+Vo(a,0):n,Ms(l)?(r="",e!=null&&(r=e.replace(Os,"$&/")+"/"),El(l,t,r,"",function(c){return c})):l!=null&&(hi(l)&&(l=Vf(l,r+(!l.key||a&&a.key===l.key?"":(""+l.key).replace(Os,"$&/")+"/")+e)),t.push(l)),1;if(a=0,n=n===""?".":n+":",Ms(e))for(var i=0;i<e.length;i++){o=e[i];var s=n+Vo(o,i);a+=El(o,t,r,s,l)}else if(s=$f(e),typeof s=="function")for(e=s.call(e),i=0;!(o=e.next()).done;)o=o.value,s=n+Vo(o,i++),a+=El(o,t,r,s,l);else if(o==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return a}function al(e,t,r){if(e==null)return e;var n=[],l=0;return El(e,n,"","",function(o){return t.call(r,o,l++)}),n}function Yf(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(r){(e._status===0||e._status===-1)&&(e._status=1,e._result=r)},function(r){(e._status===0||e._status===-1)&&(e._status=2,e._result=r)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var be={current:null},Cl={transition:null},Xf={ReactCurrentDispatcher:be,ReactCurrentBatchConfig:Cl,ReactCurrentOwner:gi};function ic(){throw Error("act(...) is not supported in production builds of React.")}H.Children={map:al,forEach:function(e,t,r){al(e,function(){t.apply(this,arguments)},r)},count:function(e){var t=0;return al(e,function(){t++}),t},toArray:function(e){return al(e,function(t){return t})||[]},only:function(e){if(!hi(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};H.Component=Xr;H.Fragment=Df;H.Profiler=Of;H.PureComponent=pi;H.StrictMode=Mf;H.Suspense=jf;H.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Xf;H.act=ic;H.cloneElement=function(e,t,r){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var n=tc({},e.props),l=e.key,o=e.ref,a=e._owner;if(t!=null){if(t.ref!==void 0&&(o=t.ref,a=gi.current),t.key!==void 0&&(l=""+t.key),e.type&&e.type.defaultProps)var i=e.type.defaultProps;for(s in t)lc.call(t,s)&&!oc.hasOwnProperty(s)&&(n[s]=t[s]===void 0&&i!==void 0?i[s]:t[s])}var s=arguments.length-2;if(s===1)n.children=r;else if(1<s){i=Array(s);for(var c=0;c<s;c++)i[c]=arguments[c+2];n.children=i}return{$$typeof:Vn,type:e.type,key:l,ref:o,props:n,_owner:a}};H.createContext=function(e){return e={$$typeof:Af,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Bf,_context:e},e.Consumer=e};H.createElement=ac;H.createFactory=function(e){var t=ac.bind(null,e);return t.type=e,t};H.createRef=function(){return{current:null}};H.forwardRef=function(e){return{$$typeof:Hf,render:e}};H.isValidElement=hi;H.lazy=function(e){return{$$typeof:Wf,_payload:{_status:-1,_result:e},_init:Yf}};H.memo=function(e,t){return{$$typeof:Uf,type:e,compare:t===void 0?null:t}};H.startTransition=function(e){var t=Cl.transition;Cl.transition={};try{e()}finally{Cl.transition=t}};H.unstable_act=ic;H.useCallback=function(e,t){return be.current.useCallback(e,t)};H.useContext=function(e){return be.current.useContext(e)};H.useDebugValue=function(){};H.useDeferredValue=function(e){return be.current.useDeferredValue(e)};H.useEffect=function(e,t){return be.current.useEffect(e,t)};H.useId=function(){return be.current.useId()};H.useImperativeHandle=function(e,t,r){return be.current.useImperativeHandle(e,t,r)};H.useInsertionEffect=function(e,t){return be.current.useInsertionEffect(e,t)};H.useLayoutEffect=function(e,t){return be.current.useLayoutEffect(e,t)};H.useMemo=function(e,t){return be.current.useMemo(e,t)};H.useReducer=function(e,t,r){return be.current.useReducer(e,t,r)};H.useRef=function(e){return be.current.useRef(e)};H.useState=function(e){return be.current.useState(e)};H.useSyncExternalStore=function(e,t,r){return be.current.useSyncExternalStore(e,t,r)};H.useTransition=function(){return be.current.useTransition()};H.version="18.3.1";qu.exports=H;var b=qu.exports;const u=zf(b);var ya={},sc={exports:{}},He={},uc={exports:{}},cc={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(e){function t(_,D){var O=_.length;_.push(D);e:for(;0<O;){var J=O-1>>>1,ie=_[J];if(0<l(ie,D))_[J]=D,_[O]=ie,O=J;else break e}}function r(_){return _.length===0?null:_[0]}function n(_){if(_.length===0)return null;var D=_[0],O=_.pop();if(O!==D){_[0]=O;e:for(var J=0,ie=_.length,yr=ie>>>1;J<yr;){var qe=2*(J+1)-1,Zr=_[qe],Le=qe+1,Tt=_[Le];if(0>l(Zr,O))Le<ie&&0>l(Tt,Zr)?(_[J]=Tt,_[Le]=O,J=Le):(_[J]=Zr,_[qe]=O,J=qe);else if(Le<ie&&0>l(Tt,O))_[J]=Tt,_[Le]=O,J=Le;else break e}}return D}function l(_,D){var O=_.sortIndex-D.sortIndex;return O!==0?O:_.id-D.id}if(typeof performance=="object"&&typeof performance.now=="function"){var o=performance;e.unstable_now=function(){return o.now()}}else{var a=Date,i=a.now();e.unstable_now=function(){return a.now()-i}}var s=[],c=[],h=1,v=null,g=3,w=!1,E=!1,x=!1,j=typeof setTimeout=="function"?setTimeout:null,f=typeof clearTimeout=="function"?clearTimeout:null,d=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function m(_){for(var D=r(c);D!==null;){if(D.callback===null)n(c);else if(D.startTime<=_)n(c),D.sortIndex=D.expirationTime,t(s,D);else break;D=r(c)}}function k(_){if(x=!1,m(_),!E)if(r(s)!==null)E=!0,Rt(y);else{var D=r(c);D!==null&&Jr(k,D.startTime-_)}}function y(_,D){E=!1,x&&(x=!1,f(R),R=-1),w=!0;var O=g;try{for(m(D),v=r(s);v!==null&&(!(v.expirationTime>D)||_&&!me());){var J=v.callback;if(typeof J=="function"){v.callback=null,g=v.priorityLevel;var ie=J(v.expirationTime<=D);D=e.unstable_now(),typeof ie=="function"?v.callback=ie:v===r(s)&&n(s),m(D)}else n(s);v=r(s)}if(v!==null)var yr=!0;else{var qe=r(c);qe!==null&&Jr(k,qe.startTime-D),yr=!1}return yr}finally{v=null,g=O,w=!1}}var I=!1,P=null,R=-1,F=5,M=-1;function me(){return!(e.unstable_now()-M<F)}function It(){if(P!==null){var _=e.unstable_now();M=_;var D=!0;try{D=P(!0,_)}finally{D?tr():(I=!1,P=null)}}else I=!1}var tr;if(typeof d=="function")tr=function(){d(It)};else if(typeof MessageChannel<"u"){var Kn=new MessageChannel,So=Kn.port2;Kn.port1.onmessage=It,tr=function(){So.postMessage(null)}}else tr=function(){j(It,0)};function Rt(_){P=_,I||(I=!0,tr())}function Jr(_,D){R=j(function(){_(e.unstable_now())},D)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(_){_.callback=null},e.unstable_continueExecution=function(){E||w||(E=!0,Rt(y))},e.unstable_forceFrameRate=function(_){0>_||125<_?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):F=0<_?Math.floor(1e3/_):5},e.unstable_getCurrentPriorityLevel=function(){return g},e.unstable_getFirstCallbackNode=function(){return r(s)},e.unstable_next=function(_){switch(g){case 1:case 2:case 3:var D=3;break;default:D=g}var O=g;g=D;try{return _()}finally{g=O}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(_,D){switch(_){case 1:case 2:case 3:case 4:case 5:break;default:_=3}var O=g;g=_;try{return D()}finally{g=O}},e.unstable_scheduleCallback=function(_,D,O){var J=e.unstable_now();switch(typeof O=="object"&&O!==null?(O=O.delay,O=typeof O=="number"&&0<O?J+O:J):O=J,_){case 1:var ie=-1;break;case 2:ie=250;break;case 5:ie=1073741823;break;case 4:ie=1e4;break;default:ie=5e3}return ie=O+ie,_={id:h++,callback:D,priorityLevel:_,startTime:O,expirationTime:ie,sortIndex:-1},O>J?(_.sortIndex=O,t(c,_),r(s)===null&&_===r(c)&&(x?(f(R),R=-1):x=!0,Jr(k,O-J))):(_.sortIndex=ie,t(s,_),E||w||(E=!0,Rt(y))),_},e.unstable_shouldYield=me,e.unstable_wrapCallback=function(_){var D=g;return function(){var O=g;g=D;try{return _.apply(this,arguments)}finally{g=O}}}})(cc);uc.exports=cc;var Qf=uc.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Kf=b,Ae=Qf;function S(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,r=1;r<arguments.length;r++)t+="&args[]="+encodeURIComponent(arguments[r]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var dc=new Set,Ln={};function hr(e,t){jr(e,t),jr(e+"Capture",t)}function jr(e,t){for(Ln[e]=t,e=0;e<t.length;e++)dc.add(t[e])}var Ct=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),xa=Object.prototype.hasOwnProperty,Jf=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Bs={},As={};function Zf(e){return xa.call(As,e)?!0:xa.call(Bs,e)?!1:Jf.test(e)?As[e]=!0:(Bs[e]=!0,!1)}function qf(e,t,r,n){if(r!==null&&r.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return n?!1:r!==null?!r.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function ep(e,t,r,n){if(t===null||typeof t>"u"||qf(e,t,r,n))return!0;if(n)return!1;if(r!==null)switch(r.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function _e(e,t,r,n,l,o,a){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=n,this.attributeNamespace=l,this.mustUseProperty=r,this.propertyName=e,this.type=t,this.sanitizeURL=o,this.removeEmptyString=a}var ve={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){ve[e]=new _e(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];ve[t]=new _e(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){ve[e]=new _e(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){ve[e]=new _e(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){ve[e]=new _e(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){ve[e]=new _e(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){ve[e]=new _e(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){ve[e]=new _e(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){ve[e]=new _e(e,5,!1,e.toLowerCase(),null,!1,!1)});var vi=/[\-:]([a-z])/g;function yi(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(vi,yi);ve[t]=new _e(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(vi,yi);ve[t]=new _e(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(vi,yi);ve[t]=new _e(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){ve[e]=new _e(e,1,!1,e.toLowerCase(),null,!1,!1)});ve.xlinkHref=new _e("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){ve[e]=new _e(e,1,!1,e.toLowerCase(),null,!0,!0)});function xi(e,t,r,n){var l=ve.hasOwnProperty(t)?ve[t]:null;(l!==null?l.type!==0:n||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(ep(t,r,l,n)&&(r=null),n||l===null?Zf(t)&&(r===null?e.removeAttribute(t):e.setAttribute(t,""+r)):l.mustUseProperty?e[l.propertyName]=r===null?l.type===3?!1:"":r:(t=l.attributeName,n=l.attributeNamespace,r===null?e.removeAttribute(t):(l=l.type,r=l===3||l===4&&r===!0?"":""+r,n?e.setAttributeNS(n,t,r):e.setAttribute(t,r))))}var Lt=Kf.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,il=Symbol.for("react.element"),Sr=Symbol.for("react.portal"),Er=Symbol.for("react.fragment"),wi=Symbol.for("react.strict_mode"),wa=Symbol.for("react.profiler"),fc=Symbol.for("react.provider"),pc=Symbol.for("react.context"),ki=Symbol.for("react.forward_ref"),ka=Symbol.for("react.suspense"),Sa=Symbol.for("react.suspense_list"),Si=Symbol.for("react.memo"),Dt=Symbol.for("react.lazy"),mc=Symbol.for("react.offscreen"),Hs=Symbol.iterator;function rn(e){return e===null||typeof e!="object"?null:(e=Hs&&e[Hs]||e["@@iterator"],typeof e=="function"?e:null)}var te=Object.assign,Go;function pn(e){if(Go===void 0)try{throw Error()}catch(r){var t=r.stack.trim().match(/\n( *(at )?)/);Go=t&&t[1]||""}return`
`+Go+e}var Yo=!1;function Xo(e,t){if(!e||Yo)return"";Yo=!0;var r=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(c){var n=c}Reflect.construct(e,[],t)}else{try{t.call()}catch(c){n=c}e.call(t.prototype)}else{try{throw Error()}catch(c){n=c}e()}}catch(c){if(c&&n&&typeof c.stack=="string"){for(var l=c.stack.split(`
`),o=n.stack.split(`
`),a=l.length-1,i=o.length-1;1<=a&&0<=i&&l[a]!==o[i];)i--;for(;1<=a&&0<=i;a--,i--)if(l[a]!==o[i]){if(a!==1||i!==1)do if(a--,i--,0>i||l[a]!==o[i]){var s=`
`+l[a].replace(" at new "," at ");return e.displayName&&s.includes("<anonymous>")&&(s=s.replace("<anonymous>",e.displayName)),s}while(1<=a&&0<=i);break}}}finally{Yo=!1,Error.prepareStackTrace=r}return(e=e?e.displayName||e.name:"")?pn(e):""}function tp(e){switch(e.tag){case 5:return pn(e.type);case 16:return pn("Lazy");case 13:return pn("Suspense");case 19:return pn("SuspenseList");case 0:case 2:case 15:return e=Xo(e.type,!1),e;case 11:return e=Xo(e.type.render,!1),e;case 1:return e=Xo(e.type,!0),e;default:return""}}function Ea(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case Er:return"Fragment";case Sr:return"Portal";case wa:return"Profiler";case wi:return"StrictMode";case ka:return"Suspense";case Sa:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case pc:return(e.displayName||"Context")+".Consumer";case fc:return(e._context.displayName||"Context")+".Provider";case ki:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case Si:return t=e.displayName||null,t!==null?t:Ea(e.type)||"Memo";case Dt:t=e._payload,e=e._init;try{return Ea(e(t))}catch{}}return null}function rp(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Ea(t);case 8:return t===wi?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Kt(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function gc(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function np(e){var t=gc(e)?"checked":"value",r=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),n=""+e[t];if(!e.hasOwnProperty(t)&&typeof r<"u"&&typeof r.get=="function"&&typeof r.set=="function"){var l=r.get,o=r.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return l.call(this)},set:function(a){n=""+a,o.call(this,a)}}),Object.defineProperty(e,t,{enumerable:r.enumerable}),{getValue:function(){return n},setValue:function(a){n=""+a},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function sl(e){e._valueTracker||(e._valueTracker=np(e))}function hc(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var r=t.getValue(),n="";return e&&(n=gc(e)?e.checked?"true":"false":e.value),e=n,e!==r?(t.setValue(e),!0):!1}function Dl(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function Ca(e,t){var r=t.checked;return te({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:r??e._wrapperState.initialChecked})}function js(e,t){var r=t.defaultValue==null?"":t.defaultValue,n=t.checked!=null?t.checked:t.defaultChecked;r=Kt(t.value!=null?t.value:r),e._wrapperState={initialChecked:n,initialValue:r,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function vc(e,t){t=t.checked,t!=null&&xi(e,"checked",t,!1)}function Na(e,t){vc(e,t);var r=Kt(t.value),n=t.type;if(r!=null)n==="number"?(r===0&&e.value===""||e.value!=r)&&(e.value=""+r):e.value!==""+r&&(e.value=""+r);else if(n==="submit"||n==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?ba(e,t.type,r):t.hasOwnProperty("defaultValue")&&ba(e,t.type,Kt(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function Us(e,t,r){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var n=t.type;if(!(n!=="submit"&&n!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,r||t===e.value||(e.value=t),e.defaultValue=t}r=e.name,r!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,r!==""&&(e.name=r)}function ba(e,t,r){(t!=="number"||Dl(e.ownerDocument)!==e)&&(r==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+r&&(e.defaultValue=""+r))}var mn=Array.isArray;function Dr(e,t,r,n){if(e=e.options,t){t={};for(var l=0;l<r.length;l++)t["$"+r[l]]=!0;for(r=0;r<e.length;r++)l=t.hasOwnProperty("$"+e[r].value),e[r].selected!==l&&(e[r].selected=l),l&&n&&(e[r].defaultSelected=!0)}else{for(r=""+Kt(r),t=null,l=0;l<e.length;l++){if(e[l].value===r){e[l].selected=!0,n&&(e[l].defaultSelected=!0);return}t!==null||e[l].disabled||(t=e[l])}t!==null&&(t.selected=!0)}}function _a(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(S(91));return te({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function Ws(e,t){var r=t.value;if(r==null){if(r=t.children,t=t.defaultValue,r!=null){if(t!=null)throw Error(S(92));if(mn(r)){if(1<r.length)throw Error(S(93));r=r[0]}t=r}t==null&&(t=""),r=t}e._wrapperState={initialValue:Kt(r)}}function yc(e,t){var r=Kt(t.value),n=Kt(t.defaultValue);r!=null&&(r=""+r,r!==e.value&&(e.value=r),t.defaultValue==null&&e.defaultValue!==r&&(e.defaultValue=r)),n!=null&&(e.defaultValue=""+n)}function $s(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function xc(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function La(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?xc(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var ul,wc=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,r,n,l){MSApp.execUnsafeLocalFunction(function(){return e(t,r,n,l)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(ul=ul||document.createElement("div"),ul.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=ul.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function In(e,t){if(t){var r=e.firstChild;if(r&&r===e.lastChild&&r.nodeType===3){r.nodeValue=t;return}}e.textContent=t}var yn={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},lp=["Webkit","ms","Moz","O"];Object.keys(yn).forEach(function(e){lp.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),yn[t]=yn[e]})});function kc(e,t,r){return t==null||typeof t=="boolean"||t===""?"":r||typeof t!="number"||t===0||yn.hasOwnProperty(e)&&yn[e]?(""+t).trim():t+"px"}function Sc(e,t){e=e.style;for(var r in t)if(t.hasOwnProperty(r)){var n=r.indexOf("--")===0,l=kc(r,t[r],n);r==="float"&&(r="cssFloat"),n?e.setProperty(r,l):e[r]=l}}var op=te({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Ia(e,t){if(t){if(op[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(S(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(S(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(S(61))}if(t.style!=null&&typeof t.style!="object")throw Error(S(62))}}function Ra(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Ta=null;function Ei(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Pa=null,Mr=null,Or=null;function Vs(e){if(e=Xn(e)){if(typeof Pa!="function")throw Error(S(280));var t=e.stateNode;t&&(t=co(t),Pa(e.stateNode,e.type,t))}}function Ec(e){Mr?Or?Or.push(e):Or=[e]:Mr=e}function Cc(){if(Mr){var e=Mr,t=Or;if(Or=Mr=null,Vs(e),t)for(e=0;e<t.length;e++)Vs(t[e])}}function Nc(e,t){return e(t)}function bc(){}var Qo=!1;function _c(e,t,r){if(Qo)return e(t,r);Qo=!0;try{return Nc(e,t,r)}finally{Qo=!1,(Mr!==null||Or!==null)&&(bc(),Cc())}}function Rn(e,t){var r=e.stateNode;if(r===null)return null;var n=co(r);if(n===null)return null;r=n[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(n=!n.disabled)||(e=e.type,n=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!n;break e;default:e=!1}if(e)return null;if(r&&typeof r!="function")throw Error(S(231,t,typeof r));return r}var za=!1;if(Ct)try{var nn={};Object.defineProperty(nn,"passive",{get:function(){za=!0}}),window.addEventListener("test",nn,nn),window.removeEventListener("test",nn,nn)}catch{za=!1}function ap(e,t,r,n,l,o,a,i,s){var c=Array.prototype.slice.call(arguments,3);try{t.apply(r,c)}catch(h){this.onError(h)}}var xn=!1,Ml=null,Ol=!1,Fa=null,ip={onError:function(e){xn=!0,Ml=e}};function sp(e,t,r,n,l,o,a,i,s){xn=!1,Ml=null,ap.apply(ip,arguments)}function up(e,t,r,n,l,o,a,i,s){if(sp.apply(this,arguments),xn){if(xn){var c=Ml;xn=!1,Ml=null}else throw Error(S(198));Ol||(Ol=!0,Fa=c)}}function vr(e){var t=e,r=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(r=t.return),e=t.return;while(e)}return t.tag===3?r:null}function Lc(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function Gs(e){if(vr(e)!==e)throw Error(S(188))}function cp(e){var t=e.alternate;if(!t){if(t=vr(e),t===null)throw Error(S(188));return t!==e?null:e}for(var r=e,n=t;;){var l=r.return;if(l===null)break;var o=l.alternate;if(o===null){if(n=l.return,n!==null){r=n;continue}break}if(l.child===o.child){for(o=l.child;o;){if(o===r)return Gs(l),e;if(o===n)return Gs(l),t;o=o.sibling}throw Error(S(188))}if(r.return!==n.return)r=l,n=o;else{for(var a=!1,i=l.child;i;){if(i===r){a=!0,r=l,n=o;break}if(i===n){a=!0,n=l,r=o;break}i=i.sibling}if(!a){for(i=o.child;i;){if(i===r){a=!0,r=o,n=l;break}if(i===n){a=!0,n=o,r=l;break}i=i.sibling}if(!a)throw Error(S(189))}}if(r.alternate!==n)throw Error(S(190))}if(r.tag!==3)throw Error(S(188));return r.stateNode.current===r?e:t}function Ic(e){return e=cp(e),e!==null?Rc(e):null}function Rc(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=Rc(e);if(t!==null)return t;e=e.sibling}return null}var Tc=Ae.unstable_scheduleCallback,Ys=Ae.unstable_cancelCallback,dp=Ae.unstable_shouldYield,fp=Ae.unstable_requestPaint,ae=Ae.unstable_now,pp=Ae.unstable_getCurrentPriorityLevel,Ci=Ae.unstable_ImmediatePriority,Pc=Ae.unstable_UserBlockingPriority,Bl=Ae.unstable_NormalPriority,mp=Ae.unstable_LowPriority,zc=Ae.unstable_IdlePriority,ao=null,ft=null;function gp(e){if(ft&&typeof ft.onCommitFiberRoot=="function")try{ft.onCommitFiberRoot(ao,e,void 0,(e.current.flags&128)===128)}catch{}}var ot=Math.clz32?Math.clz32:yp,hp=Math.log,vp=Math.LN2;function yp(e){return e>>>=0,e===0?32:31-(hp(e)/vp|0)|0}var cl=64,dl=4194304;function gn(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Al(e,t){var r=e.pendingLanes;if(r===0)return 0;var n=0,l=e.suspendedLanes,o=e.pingedLanes,a=r&268435455;if(a!==0){var i=a&~l;i!==0?n=gn(i):(o&=a,o!==0&&(n=gn(o)))}else a=r&~l,a!==0?n=gn(a):o!==0&&(n=gn(o));if(n===0)return 0;if(t!==0&&t!==n&&!(t&l)&&(l=n&-n,o=t&-t,l>=o||l===16&&(o&4194240)!==0))return t;if(n&4&&(n|=r&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=n;0<t;)r=31-ot(t),l=1<<r,n|=e[r],t&=~l;return n}function xp(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function wp(e,t){for(var r=e.suspendedLanes,n=e.pingedLanes,l=e.expirationTimes,o=e.pendingLanes;0<o;){var a=31-ot(o),i=1<<a,s=l[a];s===-1?(!(i&r)||i&n)&&(l[a]=xp(i,t)):s<=t&&(e.expiredLanes|=i),o&=~i}}function Da(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Fc(){var e=cl;return cl<<=1,!(cl&4194240)&&(cl=64),e}function Ko(e){for(var t=[],r=0;31>r;r++)t.push(e);return t}function Gn(e,t,r){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-ot(t),e[t]=r}function kp(e,t){var r=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var n=e.eventTimes;for(e=e.expirationTimes;0<r;){var l=31-ot(r),o=1<<l;t[l]=0,n[l]=-1,e[l]=-1,r&=~o}}function Ni(e,t){var r=e.entangledLanes|=t;for(e=e.entanglements;r;){var n=31-ot(r),l=1<<n;l&t|e[n]&t&&(e[n]|=t),r&=~l}}var G=0;function Dc(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var Mc,bi,Oc,Bc,Ac,Ma=!1,fl=[],Ut=null,Wt=null,$t=null,Tn=new Map,Pn=new Map,Bt=[],Sp="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Xs(e,t){switch(e){case"focusin":case"focusout":Ut=null;break;case"dragenter":case"dragleave":Wt=null;break;case"mouseover":case"mouseout":$t=null;break;case"pointerover":case"pointerout":Tn.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Pn.delete(t.pointerId)}}function ln(e,t,r,n,l,o){return e===null||e.nativeEvent!==o?(e={blockedOn:t,domEventName:r,eventSystemFlags:n,nativeEvent:o,targetContainers:[l]},t!==null&&(t=Xn(t),t!==null&&bi(t)),e):(e.eventSystemFlags|=n,t=e.targetContainers,l!==null&&t.indexOf(l)===-1&&t.push(l),e)}function Ep(e,t,r,n,l){switch(t){case"focusin":return Ut=ln(Ut,e,t,r,n,l),!0;case"dragenter":return Wt=ln(Wt,e,t,r,n,l),!0;case"mouseover":return $t=ln($t,e,t,r,n,l),!0;case"pointerover":var o=l.pointerId;return Tn.set(o,ln(Tn.get(o)||null,e,t,r,n,l)),!0;case"gotpointercapture":return o=l.pointerId,Pn.set(o,ln(Pn.get(o)||null,e,t,r,n,l)),!0}return!1}function Hc(e){var t=or(e.target);if(t!==null){var r=vr(t);if(r!==null){if(t=r.tag,t===13){if(t=Lc(r),t!==null){e.blockedOn=t,Ac(e.priority,function(){Oc(r)});return}}else if(t===3&&r.stateNode.current.memoizedState.isDehydrated){e.blockedOn=r.tag===3?r.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Nl(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var r=Oa(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(r===null){r=e.nativeEvent;var n=new r.constructor(r.type,r);Ta=n,r.target.dispatchEvent(n),Ta=null}else return t=Xn(r),t!==null&&bi(t),e.blockedOn=r,!1;t.shift()}return!0}function Qs(e,t,r){Nl(e)&&r.delete(t)}function Cp(){Ma=!1,Ut!==null&&Nl(Ut)&&(Ut=null),Wt!==null&&Nl(Wt)&&(Wt=null),$t!==null&&Nl($t)&&($t=null),Tn.forEach(Qs),Pn.forEach(Qs)}function on(e,t){e.blockedOn===t&&(e.blockedOn=null,Ma||(Ma=!0,Ae.unstable_scheduleCallback(Ae.unstable_NormalPriority,Cp)))}function zn(e){function t(l){return on(l,e)}if(0<fl.length){on(fl[0],e);for(var r=1;r<fl.length;r++){var n=fl[r];n.blockedOn===e&&(n.blockedOn=null)}}for(Ut!==null&&on(Ut,e),Wt!==null&&on(Wt,e),$t!==null&&on($t,e),Tn.forEach(t),Pn.forEach(t),r=0;r<Bt.length;r++)n=Bt[r],n.blockedOn===e&&(n.blockedOn=null);for(;0<Bt.length&&(r=Bt[0],r.blockedOn===null);)Hc(r),r.blockedOn===null&&Bt.shift()}var Br=Lt.ReactCurrentBatchConfig,Hl=!0;function Np(e,t,r,n){var l=G,o=Br.transition;Br.transition=null;try{G=1,_i(e,t,r,n)}finally{G=l,Br.transition=o}}function bp(e,t,r,n){var l=G,o=Br.transition;Br.transition=null;try{G=4,_i(e,t,r,n)}finally{G=l,Br.transition=o}}function _i(e,t,r,n){if(Hl){var l=Oa(e,t,r,n);if(l===null)aa(e,t,n,jl,r),Xs(e,n);else if(Ep(l,e,t,r,n))n.stopPropagation();else if(Xs(e,n),t&4&&-1<Sp.indexOf(e)){for(;l!==null;){var o=Xn(l);if(o!==null&&Mc(o),o=Oa(e,t,r,n),o===null&&aa(e,t,n,jl,r),o===l)break;l=o}l!==null&&n.stopPropagation()}else aa(e,t,n,null,r)}}var jl=null;function Oa(e,t,r,n){if(jl=null,e=Ei(n),e=or(e),e!==null)if(t=vr(e),t===null)e=null;else if(r=t.tag,r===13){if(e=Lc(t),e!==null)return e;e=null}else if(r===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return jl=e,null}function jc(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(pp()){case Ci:return 1;case Pc:return 4;case Bl:case mp:return 16;case zc:return 536870912;default:return 16}default:return 16}}var Ht=null,Li=null,bl=null;function Uc(){if(bl)return bl;var e,t=Li,r=t.length,n,l="value"in Ht?Ht.value:Ht.textContent,o=l.length;for(e=0;e<r&&t[e]===l[e];e++);var a=r-e;for(n=1;n<=a&&t[r-n]===l[o-n];n++);return bl=l.slice(e,1<n?1-n:void 0)}function _l(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function pl(){return!0}function Ks(){return!1}function je(e){function t(r,n,l,o,a){this._reactName=r,this._targetInst=l,this.type=n,this.nativeEvent=o,this.target=a,this.currentTarget=null;for(var i in e)e.hasOwnProperty(i)&&(r=e[i],this[i]=r?r(o):o[i]);return this.isDefaultPrevented=(o.defaultPrevented!=null?o.defaultPrevented:o.returnValue===!1)?pl:Ks,this.isPropagationStopped=Ks,this}return te(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var r=this.nativeEvent;r&&(r.preventDefault?r.preventDefault():typeof r.returnValue!="unknown"&&(r.returnValue=!1),this.isDefaultPrevented=pl)},stopPropagation:function(){var r=this.nativeEvent;r&&(r.stopPropagation?r.stopPropagation():typeof r.cancelBubble!="unknown"&&(r.cancelBubble=!0),this.isPropagationStopped=pl)},persist:function(){},isPersistent:pl}),t}var Qr={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Ii=je(Qr),Yn=te({},Qr,{view:0,detail:0}),_p=je(Yn),Jo,Zo,an,io=te({},Yn,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Ri,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==an&&(an&&e.type==="mousemove"?(Jo=e.screenX-an.screenX,Zo=e.screenY-an.screenY):Zo=Jo=0,an=e),Jo)},movementY:function(e){return"movementY"in e?e.movementY:Zo}}),Js=je(io),Lp=te({},io,{dataTransfer:0}),Ip=je(Lp),Rp=te({},Yn,{relatedTarget:0}),qo=je(Rp),Tp=te({},Qr,{animationName:0,elapsedTime:0,pseudoElement:0}),Pp=je(Tp),zp=te({},Qr,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Fp=je(zp),Dp=te({},Qr,{data:0}),Zs=je(Dp),Mp={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Op={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Bp={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Ap(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Bp[e])?!!t[e]:!1}function Ri(){return Ap}var Hp=te({},Yn,{key:function(e){if(e.key){var t=Mp[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=_l(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Op[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Ri,charCode:function(e){return e.type==="keypress"?_l(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?_l(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),jp=je(Hp),Up=te({},io,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),qs=je(Up),Wp=te({},Yn,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Ri}),$p=je(Wp),Vp=te({},Qr,{propertyName:0,elapsedTime:0,pseudoElement:0}),Gp=je(Vp),Yp=te({},io,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Xp=je(Yp),Qp=[9,13,27,32],Ti=Ct&&"CompositionEvent"in window,wn=null;Ct&&"documentMode"in document&&(wn=document.documentMode);var Kp=Ct&&"TextEvent"in window&&!wn,Wc=Ct&&(!Ti||wn&&8<wn&&11>=wn),eu=" ",tu=!1;function $c(e,t){switch(e){case"keyup":return Qp.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Vc(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var Cr=!1;function Jp(e,t){switch(e){case"compositionend":return Vc(t);case"keypress":return t.which!==32?null:(tu=!0,eu);case"textInput":return e=t.data,e===eu&&tu?null:e;default:return null}}function Zp(e,t){if(Cr)return e==="compositionend"||!Ti&&$c(e,t)?(e=Uc(),bl=Li=Ht=null,Cr=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Wc&&t.locale!=="ko"?null:t.data;default:return null}}var qp={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ru(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!qp[e.type]:t==="textarea"}function Gc(e,t,r,n){Ec(n),t=Ul(t,"onChange"),0<t.length&&(r=new Ii("onChange","change",null,r,n),e.push({event:r,listeners:t}))}var kn=null,Fn=null;function em(e){nd(e,0)}function so(e){var t=_r(e);if(hc(t))return e}function tm(e,t){if(e==="change")return t}var Yc=!1;if(Ct){var ea;if(Ct){var ta="oninput"in document;if(!ta){var nu=document.createElement("div");nu.setAttribute("oninput","return;"),ta=typeof nu.oninput=="function"}ea=ta}else ea=!1;Yc=ea&&(!document.documentMode||9<document.documentMode)}function lu(){kn&&(kn.detachEvent("onpropertychange",Xc),Fn=kn=null)}function Xc(e){if(e.propertyName==="value"&&so(Fn)){var t=[];Gc(t,Fn,e,Ei(e)),_c(em,t)}}function rm(e,t,r){e==="focusin"?(lu(),kn=t,Fn=r,kn.attachEvent("onpropertychange",Xc)):e==="focusout"&&lu()}function nm(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return so(Fn)}function lm(e,t){if(e==="click")return so(t)}function om(e,t){if(e==="input"||e==="change")return so(t)}function am(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var it=typeof Object.is=="function"?Object.is:am;function Dn(e,t){if(it(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var r=Object.keys(e),n=Object.keys(t);if(r.length!==n.length)return!1;for(n=0;n<r.length;n++){var l=r[n];if(!xa.call(t,l)||!it(e[l],t[l]))return!1}return!0}function ou(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function au(e,t){var r=ou(e);e=0;for(var n;r;){if(r.nodeType===3){if(n=e+r.textContent.length,e<=t&&n>=t)return{node:r,offset:t-e};e=n}e:{for(;r;){if(r.nextSibling){r=r.nextSibling;break e}r=r.parentNode}r=void 0}r=ou(r)}}function Qc(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Qc(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function Kc(){for(var e=window,t=Dl();t instanceof e.HTMLIFrameElement;){try{var r=typeof t.contentWindow.location.href=="string"}catch{r=!1}if(r)e=t.contentWindow;else break;t=Dl(e.document)}return t}function Pi(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function im(e){var t=Kc(),r=e.focusedElem,n=e.selectionRange;if(t!==r&&r&&r.ownerDocument&&Qc(r.ownerDocument.documentElement,r)){if(n!==null&&Pi(r)){if(t=n.start,e=n.end,e===void 0&&(e=t),"selectionStart"in r)r.selectionStart=t,r.selectionEnd=Math.min(e,r.value.length);else if(e=(t=r.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var l=r.textContent.length,o=Math.min(n.start,l);n=n.end===void 0?o:Math.min(n.end,l),!e.extend&&o>n&&(l=n,n=o,o=l),l=au(r,o);var a=au(r,n);l&&a&&(e.rangeCount!==1||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==a.node||e.focusOffset!==a.offset)&&(t=t.createRange(),t.setStart(l.node,l.offset),e.removeAllRanges(),o>n?(e.addRange(t),e.extend(a.node,a.offset)):(t.setEnd(a.node,a.offset),e.addRange(t)))}}for(t=[],e=r;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof r.focus=="function"&&r.focus(),r=0;r<t.length;r++)e=t[r],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var sm=Ct&&"documentMode"in document&&11>=document.documentMode,Nr=null,Ba=null,Sn=null,Aa=!1;function iu(e,t,r){var n=r.window===r?r.document:r.nodeType===9?r:r.ownerDocument;Aa||Nr==null||Nr!==Dl(n)||(n=Nr,"selectionStart"in n&&Pi(n)?n={start:n.selectionStart,end:n.selectionEnd}:(n=(n.ownerDocument&&n.ownerDocument.defaultView||window).getSelection(),n={anchorNode:n.anchorNode,anchorOffset:n.anchorOffset,focusNode:n.focusNode,focusOffset:n.focusOffset}),Sn&&Dn(Sn,n)||(Sn=n,n=Ul(Ba,"onSelect"),0<n.length&&(t=new Ii("onSelect","select",null,t,r),e.push({event:t,listeners:n}),t.target=Nr)))}function ml(e,t){var r={};return r[e.toLowerCase()]=t.toLowerCase(),r["Webkit"+e]="webkit"+t,r["Moz"+e]="moz"+t,r}var br={animationend:ml("Animation","AnimationEnd"),animationiteration:ml("Animation","AnimationIteration"),animationstart:ml("Animation","AnimationStart"),transitionend:ml("Transition","TransitionEnd")},ra={},Jc={};Ct&&(Jc=document.createElement("div").style,"AnimationEvent"in window||(delete br.animationend.animation,delete br.animationiteration.animation,delete br.animationstart.animation),"TransitionEvent"in window||delete br.transitionend.transition);function uo(e){if(ra[e])return ra[e];if(!br[e])return e;var t=br[e],r;for(r in t)if(t.hasOwnProperty(r)&&r in Jc)return ra[e]=t[r];return e}var Zc=uo("animationend"),qc=uo("animationiteration"),ed=uo("animationstart"),td=uo("transitionend"),rd=new Map,su="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Zt(e,t){rd.set(e,t),hr(t,[e])}for(var na=0;na<su.length;na++){var la=su[na],um=la.toLowerCase(),cm=la[0].toUpperCase()+la.slice(1);Zt(um,"on"+cm)}Zt(Zc,"onAnimationEnd");Zt(qc,"onAnimationIteration");Zt(ed,"onAnimationStart");Zt("dblclick","onDoubleClick");Zt("focusin","onFocus");Zt("focusout","onBlur");Zt(td,"onTransitionEnd");jr("onMouseEnter",["mouseout","mouseover"]);jr("onMouseLeave",["mouseout","mouseover"]);jr("onPointerEnter",["pointerout","pointerover"]);jr("onPointerLeave",["pointerout","pointerover"]);hr("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));hr("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));hr("onBeforeInput",["compositionend","keypress","textInput","paste"]);hr("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));hr("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));hr("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var hn="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),dm=new Set("cancel close invalid load scroll toggle".split(" ").concat(hn));function uu(e,t,r){var n=e.type||"unknown-event";e.currentTarget=r,up(n,t,void 0,e),e.currentTarget=null}function nd(e,t){t=(t&4)!==0;for(var r=0;r<e.length;r++){var n=e[r],l=n.event;n=n.listeners;e:{var o=void 0;if(t)for(var a=n.length-1;0<=a;a--){var i=n[a],s=i.instance,c=i.currentTarget;if(i=i.listener,s!==o&&l.isPropagationStopped())break e;uu(l,i,c),o=s}else for(a=0;a<n.length;a++){if(i=n[a],s=i.instance,c=i.currentTarget,i=i.listener,s!==o&&l.isPropagationStopped())break e;uu(l,i,c),o=s}}}if(Ol)throw e=Fa,Ol=!1,Fa=null,e}function Q(e,t){var r=t[$a];r===void 0&&(r=t[$a]=new Set);var n=e+"__bubble";r.has(n)||(ld(t,e,2,!1),r.add(n))}function oa(e,t,r){var n=0;t&&(n|=4),ld(r,e,n,t)}var gl="_reactListening"+Math.random().toString(36).slice(2);function Mn(e){if(!e[gl]){e[gl]=!0,dc.forEach(function(r){r!=="selectionchange"&&(dm.has(r)||oa(r,!1,e),oa(r,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[gl]||(t[gl]=!0,oa("selectionchange",!1,t))}}function ld(e,t,r,n){switch(jc(t)){case 1:var l=Np;break;case 4:l=bp;break;default:l=_i}r=l.bind(null,t,r,e),l=void 0,!za||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(l=!0),n?l!==void 0?e.addEventListener(t,r,{capture:!0,passive:l}):e.addEventListener(t,r,!0):l!==void 0?e.addEventListener(t,r,{passive:l}):e.addEventListener(t,r,!1)}function aa(e,t,r,n,l){var o=n;if(!(t&1)&&!(t&2)&&n!==null)e:for(;;){if(n===null)return;var a=n.tag;if(a===3||a===4){var i=n.stateNode.containerInfo;if(i===l||i.nodeType===8&&i.parentNode===l)break;if(a===4)for(a=n.return;a!==null;){var s=a.tag;if((s===3||s===4)&&(s=a.stateNode.containerInfo,s===l||s.nodeType===8&&s.parentNode===l))return;a=a.return}for(;i!==null;){if(a=or(i),a===null)return;if(s=a.tag,s===5||s===6){n=o=a;continue e}i=i.parentNode}}n=n.return}_c(function(){var c=o,h=Ei(r),v=[];e:{var g=rd.get(e);if(g!==void 0){var w=Ii,E=e;switch(e){case"keypress":if(_l(r)===0)break e;case"keydown":case"keyup":w=jp;break;case"focusin":E="focus",w=qo;break;case"focusout":E="blur",w=qo;break;case"beforeblur":case"afterblur":w=qo;break;case"click":if(r.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=Js;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=Ip;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=$p;break;case Zc:case qc:case ed:w=Pp;break;case td:w=Gp;break;case"scroll":w=_p;break;case"wheel":w=Xp;break;case"copy":case"cut":case"paste":w=Fp;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=qs}var x=(t&4)!==0,j=!x&&e==="scroll",f=x?g!==null?g+"Capture":null:g;x=[];for(var d=c,m;d!==null;){m=d;var k=m.stateNode;if(m.tag===5&&k!==null&&(m=k,f!==null&&(k=Rn(d,f),k!=null&&x.push(On(d,k,m)))),j)break;d=d.return}0<x.length&&(g=new w(g,E,null,r,h),v.push({event:g,listeners:x}))}}if(!(t&7)){e:{if(g=e==="mouseover"||e==="pointerover",w=e==="mouseout"||e==="pointerout",g&&r!==Ta&&(E=r.relatedTarget||r.fromElement)&&(or(E)||E[Nt]))break e;if((w||g)&&(g=h.window===h?h:(g=h.ownerDocument)?g.defaultView||g.parentWindow:window,w?(E=r.relatedTarget||r.toElement,w=c,E=E?or(E):null,E!==null&&(j=vr(E),E!==j||E.tag!==5&&E.tag!==6)&&(E=null)):(w=null,E=c),w!==E)){if(x=Js,k="onMouseLeave",f="onMouseEnter",d="mouse",(e==="pointerout"||e==="pointerover")&&(x=qs,k="onPointerLeave",f="onPointerEnter",d="pointer"),j=w==null?g:_r(w),m=E==null?g:_r(E),g=new x(k,d+"leave",w,r,h),g.target=j,g.relatedTarget=m,k=null,or(h)===c&&(x=new x(f,d+"enter",E,r,h),x.target=m,x.relatedTarget=j,k=x),j=k,w&&E)t:{for(x=w,f=E,d=0,m=x;m;m=wr(m))d++;for(m=0,k=f;k;k=wr(k))m++;for(;0<d-m;)x=wr(x),d--;for(;0<m-d;)f=wr(f),m--;for(;d--;){if(x===f||f!==null&&x===f.alternate)break t;x=wr(x),f=wr(f)}x=null}else x=null;w!==null&&cu(v,g,w,x,!1),E!==null&&j!==null&&cu(v,j,E,x,!0)}}e:{if(g=c?_r(c):window,w=g.nodeName&&g.nodeName.toLowerCase(),w==="select"||w==="input"&&g.type==="file")var y=tm;else if(ru(g))if(Yc)y=om;else{y=nm;var I=rm}else(w=g.nodeName)&&w.toLowerCase()==="input"&&(g.type==="checkbox"||g.type==="radio")&&(y=lm);if(y&&(y=y(e,c))){Gc(v,y,r,h);break e}I&&I(e,g,c),e==="focusout"&&(I=g._wrapperState)&&I.controlled&&g.type==="number"&&ba(g,"number",g.value)}switch(I=c?_r(c):window,e){case"focusin":(ru(I)||I.contentEditable==="true")&&(Nr=I,Ba=c,Sn=null);break;case"focusout":Sn=Ba=Nr=null;break;case"mousedown":Aa=!0;break;case"contextmenu":case"mouseup":case"dragend":Aa=!1,iu(v,r,h);break;case"selectionchange":if(sm)break;case"keydown":case"keyup":iu(v,r,h)}var P;if(Ti)e:{switch(e){case"compositionstart":var R="onCompositionStart";break e;case"compositionend":R="onCompositionEnd";break e;case"compositionupdate":R="onCompositionUpdate";break e}R=void 0}else Cr?$c(e,r)&&(R="onCompositionEnd"):e==="keydown"&&r.keyCode===229&&(R="onCompositionStart");R&&(Wc&&r.locale!=="ko"&&(Cr||R!=="onCompositionStart"?R==="onCompositionEnd"&&Cr&&(P=Uc()):(Ht=h,Li="value"in Ht?Ht.value:Ht.textContent,Cr=!0)),I=Ul(c,R),0<I.length&&(R=new Zs(R,e,null,r,h),v.push({event:R,listeners:I}),P?R.data=P:(P=Vc(r),P!==null&&(R.data=P)))),(P=Kp?Jp(e,r):Zp(e,r))&&(c=Ul(c,"onBeforeInput"),0<c.length&&(h=new Zs("onBeforeInput","beforeinput",null,r,h),v.push({event:h,listeners:c}),h.data=P))}nd(v,t)})}function On(e,t,r){return{instance:e,listener:t,currentTarget:r}}function Ul(e,t){for(var r=t+"Capture",n=[];e!==null;){var l=e,o=l.stateNode;l.tag===5&&o!==null&&(l=o,o=Rn(e,r),o!=null&&n.unshift(On(e,o,l)),o=Rn(e,t),o!=null&&n.push(On(e,o,l))),e=e.return}return n}function wr(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function cu(e,t,r,n,l){for(var o=t._reactName,a=[];r!==null&&r!==n;){var i=r,s=i.alternate,c=i.stateNode;if(s!==null&&s===n)break;i.tag===5&&c!==null&&(i=c,l?(s=Rn(r,o),s!=null&&a.unshift(On(r,s,i))):l||(s=Rn(r,o),s!=null&&a.push(On(r,s,i)))),r=r.return}a.length!==0&&e.push({event:t,listeners:a})}var fm=/\r\n?/g,pm=/\u0000|\uFFFD/g;function du(e){return(typeof e=="string"?e:""+e).replace(fm,`
`).replace(pm,"")}function hl(e,t,r){if(t=du(t),du(e)!==t&&r)throw Error(S(425))}function Wl(){}var Ha=null,ja=null;function Ua(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Wa=typeof setTimeout=="function"?setTimeout:void 0,mm=typeof clearTimeout=="function"?clearTimeout:void 0,fu=typeof Promise=="function"?Promise:void 0,gm=typeof queueMicrotask=="function"?queueMicrotask:typeof fu<"u"?function(e){return fu.resolve(null).then(e).catch(hm)}:Wa;function hm(e){setTimeout(function(){throw e})}function ia(e,t){var r=t,n=0;do{var l=r.nextSibling;if(e.removeChild(r),l&&l.nodeType===8)if(r=l.data,r==="/$"){if(n===0){e.removeChild(l),zn(t);return}n--}else r!=="$"&&r!=="$?"&&r!=="$!"||n++;r=l}while(r);zn(t)}function Vt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function pu(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="$"||r==="$!"||r==="$?"){if(t===0)return e;t--}else r==="/$"&&t++}e=e.previousSibling}return null}var Kr=Math.random().toString(36).slice(2),dt="__reactFiber$"+Kr,Bn="__reactProps$"+Kr,Nt="__reactContainer$"+Kr,$a="__reactEvents$"+Kr,vm="__reactListeners$"+Kr,ym="__reactHandles$"+Kr;function or(e){var t=e[dt];if(t)return t;for(var r=e.parentNode;r;){if(t=r[Nt]||r[dt]){if(r=t.alternate,t.child!==null||r!==null&&r.child!==null)for(e=pu(e);e!==null;){if(r=e[dt])return r;e=pu(e)}return t}e=r,r=e.parentNode}return null}function Xn(e){return e=e[dt]||e[Nt],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function _r(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(S(33))}function co(e){return e[Bn]||null}var Va=[],Lr=-1;function qt(e){return{current:e}}function K(e){0>Lr||(e.current=Va[Lr],Va[Lr]=null,Lr--)}function Y(e,t){Lr++,Va[Lr]=e.current,e.current=t}var Jt={},ke=qt(Jt),Te=qt(!1),dr=Jt;function Ur(e,t){var r=e.type.contextTypes;if(!r)return Jt;var n=e.stateNode;if(n&&n.__reactInternalMemoizedUnmaskedChildContext===t)return n.__reactInternalMemoizedMaskedChildContext;var l={},o;for(o in r)l[o]=t[o];return n&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=l),l}function Pe(e){return e=e.childContextTypes,e!=null}function $l(){K(Te),K(ke)}function mu(e,t,r){if(ke.current!==Jt)throw Error(S(168));Y(ke,t),Y(Te,r)}function od(e,t,r){var n=e.stateNode;if(t=t.childContextTypes,typeof n.getChildContext!="function")return r;n=n.getChildContext();for(var l in n)if(!(l in t))throw Error(S(108,rp(e)||"Unknown",l));return te({},r,n)}function Vl(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||Jt,dr=ke.current,Y(ke,e),Y(Te,Te.current),!0}function gu(e,t,r){var n=e.stateNode;if(!n)throw Error(S(169));r?(e=od(e,t,dr),n.__reactInternalMemoizedMergedChildContext=e,K(Te),K(ke),Y(ke,e)):K(Te),Y(Te,r)}var wt=null,fo=!1,sa=!1;function ad(e){wt===null?wt=[e]:wt.push(e)}function xm(e){fo=!0,ad(e)}function er(){if(!sa&&wt!==null){sa=!0;var e=0,t=G;try{var r=wt;for(G=1;e<r.length;e++){var n=r[e];do n=n(!0);while(n!==null)}wt=null,fo=!1}catch(l){throw wt!==null&&(wt=wt.slice(e+1)),Tc(Ci,er),l}finally{G=t,sa=!1}}return null}var Ir=[],Rr=0,Gl=null,Yl=0,Ye=[],Xe=0,fr=null,kt=1,St="";function nr(e,t){Ir[Rr++]=Yl,Ir[Rr++]=Gl,Gl=e,Yl=t}function id(e,t,r){Ye[Xe++]=kt,Ye[Xe++]=St,Ye[Xe++]=fr,fr=e;var n=kt;e=St;var l=32-ot(n)-1;n&=~(1<<l),r+=1;var o=32-ot(t)+l;if(30<o){var a=l-l%5;o=(n&(1<<a)-1).toString(32),n>>=a,l-=a,kt=1<<32-ot(t)+l|r<<l|n,St=o+e}else kt=1<<o|r<<l|n,St=e}function zi(e){e.return!==null&&(nr(e,1),id(e,1,0))}function Fi(e){for(;e===Gl;)Gl=Ir[--Rr],Ir[Rr]=null,Yl=Ir[--Rr],Ir[Rr]=null;for(;e===fr;)fr=Ye[--Xe],Ye[Xe]=null,St=Ye[--Xe],Ye[Xe]=null,kt=Ye[--Xe],Ye[Xe]=null}var Be=null,Oe=null,Z=!1,lt=null;function sd(e,t){var r=Qe(5,null,null,0);r.elementType="DELETED",r.stateNode=t,r.return=e,t=e.deletions,t===null?(e.deletions=[r],e.flags|=16):t.push(r)}function hu(e,t){switch(e.tag){case 5:var r=e.type;return t=t.nodeType!==1||r.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Be=e,Oe=Vt(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Be=e,Oe=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(r=fr!==null?{id:kt,overflow:St}:null,e.memoizedState={dehydrated:t,treeContext:r,retryLane:1073741824},r=Qe(18,null,null,0),r.stateNode=t,r.return=e,e.child=r,Be=e,Oe=null,!0):!1;default:return!1}}function Ga(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Ya(e){if(Z){var t=Oe;if(t){var r=t;if(!hu(e,t)){if(Ga(e))throw Error(S(418));t=Vt(r.nextSibling);var n=Be;t&&hu(e,t)?sd(n,r):(e.flags=e.flags&-4097|2,Z=!1,Be=e)}}else{if(Ga(e))throw Error(S(418));e.flags=e.flags&-4097|2,Z=!1,Be=e}}}function vu(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Be=e}function vl(e){if(e!==Be)return!1;if(!Z)return vu(e),Z=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!Ua(e.type,e.memoizedProps)),t&&(t=Oe)){if(Ga(e))throw ud(),Error(S(418));for(;t;)sd(e,t),t=Vt(t.nextSibling)}if(vu(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(S(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="/$"){if(t===0){Oe=Vt(e.nextSibling);break e}t--}else r!=="$"&&r!=="$!"&&r!=="$?"||t++}e=e.nextSibling}Oe=null}}else Oe=Be?Vt(e.stateNode.nextSibling):null;return!0}function ud(){for(var e=Oe;e;)e=Vt(e.nextSibling)}function Wr(){Oe=Be=null,Z=!1}function Di(e){lt===null?lt=[e]:lt.push(e)}var wm=Lt.ReactCurrentBatchConfig;function sn(e,t,r){if(e=r.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(r._owner){if(r=r._owner,r){if(r.tag!==1)throw Error(S(309));var n=r.stateNode}if(!n)throw Error(S(147,e));var l=n,o=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===o?t.ref:(t=function(a){var i=l.refs;a===null?delete i[o]:i[o]=a},t._stringRef=o,t)}if(typeof e!="string")throw Error(S(284));if(!r._owner)throw Error(S(290,e))}return e}function yl(e,t){throw e=Object.prototype.toString.call(t),Error(S(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function yu(e){var t=e._init;return t(e._payload)}function cd(e){function t(f,d){if(e){var m=f.deletions;m===null?(f.deletions=[d],f.flags|=16):m.push(d)}}function r(f,d){if(!e)return null;for(;d!==null;)t(f,d),d=d.sibling;return null}function n(f,d){for(f=new Map;d!==null;)d.key!==null?f.set(d.key,d):f.set(d.index,d),d=d.sibling;return f}function l(f,d){return f=Qt(f,d),f.index=0,f.sibling=null,f}function o(f,d,m){return f.index=m,e?(m=f.alternate,m!==null?(m=m.index,m<d?(f.flags|=2,d):m):(f.flags|=2,d)):(f.flags|=1048576,d)}function a(f){return e&&f.alternate===null&&(f.flags|=2),f}function i(f,d,m,k){return d===null||d.tag!==6?(d=ga(m,f.mode,k),d.return=f,d):(d=l(d,m),d.return=f,d)}function s(f,d,m,k){var y=m.type;return y===Er?h(f,d,m.props.children,k,m.key):d!==null&&(d.elementType===y||typeof y=="object"&&y!==null&&y.$$typeof===Dt&&yu(y)===d.type)?(k=l(d,m.props),k.ref=sn(f,d,m),k.return=f,k):(k=Fl(m.type,m.key,m.props,null,f.mode,k),k.ref=sn(f,d,m),k.return=f,k)}function c(f,d,m,k){return d===null||d.tag!==4||d.stateNode.containerInfo!==m.containerInfo||d.stateNode.implementation!==m.implementation?(d=ha(m,f.mode,k),d.return=f,d):(d=l(d,m.children||[]),d.return=f,d)}function h(f,d,m,k,y){return d===null||d.tag!==7?(d=ur(m,f.mode,k,y),d.return=f,d):(d=l(d,m),d.return=f,d)}function v(f,d,m){if(typeof d=="string"&&d!==""||typeof d=="number")return d=ga(""+d,f.mode,m),d.return=f,d;if(typeof d=="object"&&d!==null){switch(d.$$typeof){case il:return m=Fl(d.type,d.key,d.props,null,f.mode,m),m.ref=sn(f,null,d),m.return=f,m;case Sr:return d=ha(d,f.mode,m),d.return=f,d;case Dt:var k=d._init;return v(f,k(d._payload),m)}if(mn(d)||rn(d))return d=ur(d,f.mode,m,null),d.return=f,d;yl(f,d)}return null}function g(f,d,m,k){var y=d!==null?d.key:null;if(typeof m=="string"&&m!==""||typeof m=="number")return y!==null?null:i(f,d,""+m,k);if(typeof m=="object"&&m!==null){switch(m.$$typeof){case il:return m.key===y?s(f,d,m,k):null;case Sr:return m.key===y?c(f,d,m,k):null;case Dt:return y=m._init,g(f,d,y(m._payload),k)}if(mn(m)||rn(m))return y!==null?null:h(f,d,m,k,null);yl(f,m)}return null}function w(f,d,m,k,y){if(typeof k=="string"&&k!==""||typeof k=="number")return f=f.get(m)||null,i(d,f,""+k,y);if(typeof k=="object"&&k!==null){switch(k.$$typeof){case il:return f=f.get(k.key===null?m:k.key)||null,s(d,f,k,y);case Sr:return f=f.get(k.key===null?m:k.key)||null,c(d,f,k,y);case Dt:var I=k._init;return w(f,d,m,I(k._payload),y)}if(mn(k)||rn(k))return f=f.get(m)||null,h(d,f,k,y,null);yl(d,k)}return null}function E(f,d,m,k){for(var y=null,I=null,P=d,R=d=0,F=null;P!==null&&R<m.length;R++){P.index>R?(F=P,P=null):F=P.sibling;var M=g(f,P,m[R],k);if(M===null){P===null&&(P=F);break}e&&P&&M.alternate===null&&t(f,P),d=o(M,d,R),I===null?y=M:I.sibling=M,I=M,P=F}if(R===m.length)return r(f,P),Z&&nr(f,R),y;if(P===null){for(;R<m.length;R++)P=v(f,m[R],k),P!==null&&(d=o(P,d,R),I===null?y=P:I.sibling=P,I=P);return Z&&nr(f,R),y}for(P=n(f,P);R<m.length;R++)F=w(P,f,R,m[R],k),F!==null&&(e&&F.alternate!==null&&P.delete(F.key===null?R:F.key),d=o(F,d,R),I===null?y=F:I.sibling=F,I=F);return e&&P.forEach(function(me){return t(f,me)}),Z&&nr(f,R),y}function x(f,d,m,k){var y=rn(m);if(typeof y!="function")throw Error(S(150));if(m=y.call(m),m==null)throw Error(S(151));for(var I=y=null,P=d,R=d=0,F=null,M=m.next();P!==null&&!M.done;R++,M=m.next()){P.index>R?(F=P,P=null):F=P.sibling;var me=g(f,P,M.value,k);if(me===null){P===null&&(P=F);break}e&&P&&me.alternate===null&&t(f,P),d=o(me,d,R),I===null?y=me:I.sibling=me,I=me,P=F}if(M.done)return r(f,P),Z&&nr(f,R),y;if(P===null){for(;!M.done;R++,M=m.next())M=v(f,M.value,k),M!==null&&(d=o(M,d,R),I===null?y=M:I.sibling=M,I=M);return Z&&nr(f,R),y}for(P=n(f,P);!M.done;R++,M=m.next())M=w(P,f,R,M.value,k),M!==null&&(e&&M.alternate!==null&&P.delete(M.key===null?R:M.key),d=o(M,d,R),I===null?y=M:I.sibling=M,I=M);return e&&P.forEach(function(It){return t(f,It)}),Z&&nr(f,R),y}function j(f,d,m,k){if(typeof m=="object"&&m!==null&&m.type===Er&&m.key===null&&(m=m.props.children),typeof m=="object"&&m!==null){switch(m.$$typeof){case il:e:{for(var y=m.key,I=d;I!==null;){if(I.key===y){if(y=m.type,y===Er){if(I.tag===7){r(f,I.sibling),d=l(I,m.props.children),d.return=f,f=d;break e}}else if(I.elementType===y||typeof y=="object"&&y!==null&&y.$$typeof===Dt&&yu(y)===I.type){r(f,I.sibling),d=l(I,m.props),d.ref=sn(f,I,m),d.return=f,f=d;break e}r(f,I);break}else t(f,I);I=I.sibling}m.type===Er?(d=ur(m.props.children,f.mode,k,m.key),d.return=f,f=d):(k=Fl(m.type,m.key,m.props,null,f.mode,k),k.ref=sn(f,d,m),k.return=f,f=k)}return a(f);case Sr:e:{for(I=m.key;d!==null;){if(d.key===I)if(d.tag===4&&d.stateNode.containerInfo===m.containerInfo&&d.stateNode.implementation===m.implementation){r(f,d.sibling),d=l(d,m.children||[]),d.return=f,f=d;break e}else{r(f,d);break}else t(f,d);d=d.sibling}d=ha(m,f.mode,k),d.return=f,f=d}return a(f);case Dt:return I=m._init,j(f,d,I(m._payload),k)}if(mn(m))return E(f,d,m,k);if(rn(m))return x(f,d,m,k);yl(f,m)}return typeof m=="string"&&m!==""||typeof m=="number"?(m=""+m,d!==null&&d.tag===6?(r(f,d.sibling),d=l(d,m),d.return=f,f=d):(r(f,d),d=ga(m,f.mode,k),d.return=f,f=d),a(f)):r(f,d)}return j}var $r=cd(!0),dd=cd(!1),Xl=qt(null),Ql=null,Tr=null,Mi=null;function Oi(){Mi=Tr=Ql=null}function Bi(e){var t=Xl.current;K(Xl),e._currentValue=t}function Xa(e,t,r){for(;e!==null;){var n=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,n!==null&&(n.childLanes|=t)):n!==null&&(n.childLanes&t)!==t&&(n.childLanes|=t),e===r)break;e=e.return}}function Ar(e,t){Ql=e,Mi=Tr=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(Re=!0),e.firstContext=null)}function Je(e){var t=e._currentValue;if(Mi!==e)if(e={context:e,memoizedValue:t,next:null},Tr===null){if(Ql===null)throw Error(S(308));Tr=e,Ql.dependencies={lanes:0,firstContext:e}}else Tr=Tr.next=e;return t}var ar=null;function Ai(e){ar===null?ar=[e]:ar.push(e)}function fd(e,t,r,n){var l=t.interleaved;return l===null?(r.next=r,Ai(t)):(r.next=l.next,l.next=r),t.interleaved=r,bt(e,n)}function bt(e,t){e.lanes|=t;var r=e.alternate;for(r!==null&&(r.lanes|=t),r=e,e=e.return;e!==null;)e.childLanes|=t,r=e.alternate,r!==null&&(r.childLanes|=t),r=e,e=e.return;return r.tag===3?r.stateNode:null}var Mt=!1;function Hi(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function pd(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function Et(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function Gt(e,t,r){var n=e.updateQueue;if(n===null)return null;if(n=n.shared,W&2){var l=n.pending;return l===null?t.next=t:(t.next=l.next,l.next=t),n.pending=t,bt(e,r)}return l=n.interleaved,l===null?(t.next=t,Ai(n)):(t.next=l.next,l.next=t),n.interleaved=t,bt(e,r)}function Ll(e,t,r){if(t=t.updateQueue,t!==null&&(t=t.shared,(r&4194240)!==0)){var n=t.lanes;n&=e.pendingLanes,r|=n,t.lanes=r,Ni(e,r)}}function xu(e,t){var r=e.updateQueue,n=e.alternate;if(n!==null&&(n=n.updateQueue,r===n)){var l=null,o=null;if(r=r.firstBaseUpdate,r!==null){do{var a={eventTime:r.eventTime,lane:r.lane,tag:r.tag,payload:r.payload,callback:r.callback,next:null};o===null?l=o=a:o=o.next=a,r=r.next}while(r!==null);o===null?l=o=t:o=o.next=t}else l=o=t;r={baseState:n.baseState,firstBaseUpdate:l,lastBaseUpdate:o,shared:n.shared,effects:n.effects},e.updateQueue=r;return}e=r.lastBaseUpdate,e===null?r.firstBaseUpdate=t:e.next=t,r.lastBaseUpdate=t}function Kl(e,t,r,n){var l=e.updateQueue;Mt=!1;var o=l.firstBaseUpdate,a=l.lastBaseUpdate,i=l.shared.pending;if(i!==null){l.shared.pending=null;var s=i,c=s.next;s.next=null,a===null?o=c:a.next=c,a=s;var h=e.alternate;h!==null&&(h=h.updateQueue,i=h.lastBaseUpdate,i!==a&&(i===null?h.firstBaseUpdate=c:i.next=c,h.lastBaseUpdate=s))}if(o!==null){var v=l.baseState;a=0,h=c=s=null,i=o;do{var g=i.lane,w=i.eventTime;if((n&g)===g){h!==null&&(h=h.next={eventTime:w,lane:0,tag:i.tag,payload:i.payload,callback:i.callback,next:null});e:{var E=e,x=i;switch(g=t,w=r,x.tag){case 1:if(E=x.payload,typeof E=="function"){v=E.call(w,v,g);break e}v=E;break e;case 3:E.flags=E.flags&-65537|128;case 0:if(E=x.payload,g=typeof E=="function"?E.call(w,v,g):E,g==null)break e;v=te({},v,g);break e;case 2:Mt=!0}}i.callback!==null&&i.lane!==0&&(e.flags|=64,g=l.effects,g===null?l.effects=[i]:g.push(i))}else w={eventTime:w,lane:g,tag:i.tag,payload:i.payload,callback:i.callback,next:null},h===null?(c=h=w,s=v):h=h.next=w,a|=g;if(i=i.next,i===null){if(i=l.shared.pending,i===null)break;g=i,i=g.next,g.next=null,l.lastBaseUpdate=g,l.shared.pending=null}}while(!0);if(h===null&&(s=v),l.baseState=s,l.firstBaseUpdate=c,l.lastBaseUpdate=h,t=l.shared.interleaved,t!==null){l=t;do a|=l.lane,l=l.next;while(l!==t)}else o===null&&(l.shared.lanes=0);mr|=a,e.lanes=a,e.memoizedState=v}}function wu(e,t,r){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var n=e[t],l=n.callback;if(l!==null){if(n.callback=null,n=r,typeof l!="function")throw Error(S(191,l));l.call(n)}}}var Qn={},pt=qt(Qn),An=qt(Qn),Hn=qt(Qn);function ir(e){if(e===Qn)throw Error(S(174));return e}function ji(e,t){switch(Y(Hn,t),Y(An,e),Y(pt,Qn),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:La(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=La(t,e)}K(pt),Y(pt,t)}function Vr(){K(pt),K(An),K(Hn)}function md(e){ir(Hn.current);var t=ir(pt.current),r=La(t,e.type);t!==r&&(Y(An,e),Y(pt,r))}function Ui(e){An.current===e&&(K(pt),K(An))}var q=qt(0);function Jl(e){for(var t=e;t!==null;){if(t.tag===13){var r=t.memoizedState;if(r!==null&&(r=r.dehydrated,r===null||r.data==="$?"||r.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var ua=[];function Wi(){for(var e=0;e<ua.length;e++)ua[e]._workInProgressVersionPrimary=null;ua.length=0}var Il=Lt.ReactCurrentDispatcher,ca=Lt.ReactCurrentBatchConfig,pr=0,ee=null,ce=null,fe=null,Zl=!1,En=!1,jn=0,km=0;function ye(){throw Error(S(321))}function $i(e,t){if(t===null)return!1;for(var r=0;r<t.length&&r<e.length;r++)if(!it(e[r],t[r]))return!1;return!0}function Vi(e,t,r,n,l,o){if(pr=o,ee=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Il.current=e===null||e.memoizedState===null?Nm:bm,e=r(n,l),En){o=0;do{if(En=!1,jn=0,25<=o)throw Error(S(301));o+=1,fe=ce=null,t.updateQueue=null,Il.current=_m,e=r(n,l)}while(En)}if(Il.current=ql,t=ce!==null&&ce.next!==null,pr=0,fe=ce=ee=null,Zl=!1,t)throw Error(S(300));return e}function Gi(){var e=jn!==0;return jn=0,e}function ct(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return fe===null?ee.memoizedState=fe=e:fe=fe.next=e,fe}function Ze(){if(ce===null){var e=ee.alternate;e=e!==null?e.memoizedState:null}else e=ce.next;var t=fe===null?ee.memoizedState:fe.next;if(t!==null)fe=t,ce=e;else{if(e===null)throw Error(S(310));ce=e,e={memoizedState:ce.memoizedState,baseState:ce.baseState,baseQueue:ce.baseQueue,queue:ce.queue,next:null},fe===null?ee.memoizedState=fe=e:fe=fe.next=e}return fe}function Un(e,t){return typeof t=="function"?t(e):t}function da(e){var t=Ze(),r=t.queue;if(r===null)throw Error(S(311));r.lastRenderedReducer=e;var n=ce,l=n.baseQueue,o=r.pending;if(o!==null){if(l!==null){var a=l.next;l.next=o.next,o.next=a}n.baseQueue=l=o,r.pending=null}if(l!==null){o=l.next,n=n.baseState;var i=a=null,s=null,c=o;do{var h=c.lane;if((pr&h)===h)s!==null&&(s=s.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),n=c.hasEagerState?c.eagerState:e(n,c.action);else{var v={lane:h,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};s===null?(i=s=v,a=n):s=s.next=v,ee.lanes|=h,mr|=h}c=c.next}while(c!==null&&c!==o);s===null?a=n:s.next=i,it(n,t.memoizedState)||(Re=!0),t.memoizedState=n,t.baseState=a,t.baseQueue=s,r.lastRenderedState=n}if(e=r.interleaved,e!==null){l=e;do o=l.lane,ee.lanes|=o,mr|=o,l=l.next;while(l!==e)}else l===null&&(r.lanes=0);return[t.memoizedState,r.dispatch]}function fa(e){var t=Ze(),r=t.queue;if(r===null)throw Error(S(311));r.lastRenderedReducer=e;var n=r.dispatch,l=r.pending,o=t.memoizedState;if(l!==null){r.pending=null;var a=l=l.next;do o=e(o,a.action),a=a.next;while(a!==l);it(o,t.memoizedState)||(Re=!0),t.memoizedState=o,t.baseQueue===null&&(t.baseState=o),r.lastRenderedState=o}return[o,n]}function gd(){}function hd(e,t){var r=ee,n=Ze(),l=t(),o=!it(n.memoizedState,l);if(o&&(n.memoizedState=l,Re=!0),n=n.queue,Yi(xd.bind(null,r,n,e),[e]),n.getSnapshot!==t||o||fe!==null&&fe.memoizedState.tag&1){if(r.flags|=2048,Wn(9,yd.bind(null,r,n,l,t),void 0,null),pe===null)throw Error(S(349));pr&30||vd(r,t,l)}return l}function vd(e,t,r){e.flags|=16384,e={getSnapshot:t,value:r},t=ee.updateQueue,t===null?(t={lastEffect:null,stores:null},ee.updateQueue=t,t.stores=[e]):(r=t.stores,r===null?t.stores=[e]:r.push(e))}function yd(e,t,r,n){t.value=r,t.getSnapshot=n,wd(t)&&kd(e)}function xd(e,t,r){return r(function(){wd(t)&&kd(e)})}function wd(e){var t=e.getSnapshot;e=e.value;try{var r=t();return!it(e,r)}catch{return!0}}function kd(e){var t=bt(e,1);t!==null&&at(t,e,1,-1)}function ku(e){var t=ct();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Un,lastRenderedState:e},t.queue=e,e=e.dispatch=Cm.bind(null,ee,e),[t.memoizedState,e]}function Wn(e,t,r,n){return e={tag:e,create:t,destroy:r,deps:n,next:null},t=ee.updateQueue,t===null?(t={lastEffect:null,stores:null},ee.updateQueue=t,t.lastEffect=e.next=e):(r=t.lastEffect,r===null?t.lastEffect=e.next=e:(n=r.next,r.next=e,e.next=n,t.lastEffect=e)),e}function Sd(){return Ze().memoizedState}function Rl(e,t,r,n){var l=ct();ee.flags|=e,l.memoizedState=Wn(1|t,r,void 0,n===void 0?null:n)}function po(e,t,r,n){var l=Ze();n=n===void 0?null:n;var o=void 0;if(ce!==null){var a=ce.memoizedState;if(o=a.destroy,n!==null&&$i(n,a.deps)){l.memoizedState=Wn(t,r,o,n);return}}ee.flags|=e,l.memoizedState=Wn(1|t,r,o,n)}function Su(e,t){return Rl(8390656,8,e,t)}function Yi(e,t){return po(2048,8,e,t)}function Ed(e,t){return po(4,2,e,t)}function Cd(e,t){return po(4,4,e,t)}function Nd(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function bd(e,t,r){return r=r!=null?r.concat([e]):null,po(4,4,Nd.bind(null,t,e),r)}function Xi(){}function _d(e,t){var r=Ze();t=t===void 0?null:t;var n=r.memoizedState;return n!==null&&t!==null&&$i(t,n[1])?n[0]:(r.memoizedState=[e,t],e)}function Ld(e,t){var r=Ze();t=t===void 0?null:t;var n=r.memoizedState;return n!==null&&t!==null&&$i(t,n[1])?n[0]:(e=e(),r.memoizedState=[e,t],e)}function Id(e,t,r){return pr&21?(it(r,t)||(r=Fc(),ee.lanes|=r,mr|=r,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,Re=!0),e.memoizedState=r)}function Sm(e,t){var r=G;G=r!==0&&4>r?r:4,e(!0);var n=ca.transition;ca.transition={};try{e(!1),t()}finally{G=r,ca.transition=n}}function Rd(){return Ze().memoizedState}function Em(e,t,r){var n=Xt(e);if(r={lane:n,action:r,hasEagerState:!1,eagerState:null,next:null},Td(e))Pd(t,r);else if(r=fd(e,t,r,n),r!==null){var l=Ne();at(r,e,n,l),zd(r,t,n)}}function Cm(e,t,r){var n=Xt(e),l={lane:n,action:r,hasEagerState:!1,eagerState:null,next:null};if(Td(e))Pd(t,l);else{var o=e.alternate;if(e.lanes===0&&(o===null||o.lanes===0)&&(o=t.lastRenderedReducer,o!==null))try{var a=t.lastRenderedState,i=o(a,r);if(l.hasEagerState=!0,l.eagerState=i,it(i,a)){var s=t.interleaved;s===null?(l.next=l,Ai(t)):(l.next=s.next,s.next=l),t.interleaved=l;return}}catch{}finally{}r=fd(e,t,l,n),r!==null&&(l=Ne(),at(r,e,n,l),zd(r,t,n))}}function Td(e){var t=e.alternate;return e===ee||t!==null&&t===ee}function Pd(e,t){En=Zl=!0;var r=e.pending;r===null?t.next=t:(t.next=r.next,r.next=t),e.pending=t}function zd(e,t,r){if(r&4194240){var n=t.lanes;n&=e.pendingLanes,r|=n,t.lanes=r,Ni(e,r)}}var ql={readContext:Je,useCallback:ye,useContext:ye,useEffect:ye,useImperativeHandle:ye,useInsertionEffect:ye,useLayoutEffect:ye,useMemo:ye,useReducer:ye,useRef:ye,useState:ye,useDebugValue:ye,useDeferredValue:ye,useTransition:ye,useMutableSource:ye,useSyncExternalStore:ye,useId:ye,unstable_isNewReconciler:!1},Nm={readContext:Je,useCallback:function(e,t){return ct().memoizedState=[e,t===void 0?null:t],e},useContext:Je,useEffect:Su,useImperativeHandle:function(e,t,r){return r=r!=null?r.concat([e]):null,Rl(4194308,4,Nd.bind(null,t,e),r)},useLayoutEffect:function(e,t){return Rl(4194308,4,e,t)},useInsertionEffect:function(e,t){return Rl(4,2,e,t)},useMemo:function(e,t){var r=ct();return t=t===void 0?null:t,e=e(),r.memoizedState=[e,t],e},useReducer:function(e,t,r){var n=ct();return t=r!==void 0?r(t):t,n.memoizedState=n.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},n.queue=e,e=e.dispatch=Em.bind(null,ee,e),[n.memoizedState,e]},useRef:function(e){var t=ct();return e={current:e},t.memoizedState=e},useState:ku,useDebugValue:Xi,useDeferredValue:function(e){return ct().memoizedState=e},useTransition:function(){var e=ku(!1),t=e[0];return e=Sm.bind(null,e[1]),ct().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,r){var n=ee,l=ct();if(Z){if(r===void 0)throw Error(S(407));r=r()}else{if(r=t(),pe===null)throw Error(S(349));pr&30||vd(n,t,r)}l.memoizedState=r;var o={value:r,getSnapshot:t};return l.queue=o,Su(xd.bind(null,n,o,e),[e]),n.flags|=2048,Wn(9,yd.bind(null,n,o,r,t),void 0,null),r},useId:function(){var e=ct(),t=pe.identifierPrefix;if(Z){var r=St,n=kt;r=(n&~(1<<32-ot(n)-1)).toString(32)+r,t=":"+t+"R"+r,r=jn++,0<r&&(t+="H"+r.toString(32)),t+=":"}else r=km++,t=":"+t+"r"+r.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},bm={readContext:Je,useCallback:_d,useContext:Je,useEffect:Yi,useImperativeHandle:bd,useInsertionEffect:Ed,useLayoutEffect:Cd,useMemo:Ld,useReducer:da,useRef:Sd,useState:function(){return da(Un)},useDebugValue:Xi,useDeferredValue:function(e){var t=Ze();return Id(t,ce.memoizedState,e)},useTransition:function(){var e=da(Un)[0],t=Ze().memoizedState;return[e,t]},useMutableSource:gd,useSyncExternalStore:hd,useId:Rd,unstable_isNewReconciler:!1},_m={readContext:Je,useCallback:_d,useContext:Je,useEffect:Yi,useImperativeHandle:bd,useInsertionEffect:Ed,useLayoutEffect:Cd,useMemo:Ld,useReducer:fa,useRef:Sd,useState:function(){return fa(Un)},useDebugValue:Xi,useDeferredValue:function(e){var t=Ze();return ce===null?t.memoizedState=e:Id(t,ce.memoizedState,e)},useTransition:function(){var e=fa(Un)[0],t=Ze().memoizedState;return[e,t]},useMutableSource:gd,useSyncExternalStore:hd,useId:Rd,unstable_isNewReconciler:!1};function rt(e,t){if(e&&e.defaultProps){t=te({},t),e=e.defaultProps;for(var r in e)t[r]===void 0&&(t[r]=e[r]);return t}return t}function Qa(e,t,r,n){t=e.memoizedState,r=r(n,t),r=r==null?t:te({},t,r),e.memoizedState=r,e.lanes===0&&(e.updateQueue.baseState=r)}var mo={isMounted:function(e){return(e=e._reactInternals)?vr(e)===e:!1},enqueueSetState:function(e,t,r){e=e._reactInternals;var n=Ne(),l=Xt(e),o=Et(n,l);o.payload=t,r!=null&&(o.callback=r),t=Gt(e,o,l),t!==null&&(at(t,e,l,n),Ll(t,e,l))},enqueueReplaceState:function(e,t,r){e=e._reactInternals;var n=Ne(),l=Xt(e),o=Et(n,l);o.tag=1,o.payload=t,r!=null&&(o.callback=r),t=Gt(e,o,l),t!==null&&(at(t,e,l,n),Ll(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var r=Ne(),n=Xt(e),l=Et(r,n);l.tag=2,t!=null&&(l.callback=t),t=Gt(e,l,n),t!==null&&(at(t,e,n,r),Ll(t,e,n))}};function Eu(e,t,r,n,l,o,a){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(n,o,a):t.prototype&&t.prototype.isPureReactComponent?!Dn(r,n)||!Dn(l,o):!0}function Fd(e,t,r){var n=!1,l=Jt,o=t.contextType;return typeof o=="object"&&o!==null?o=Je(o):(l=Pe(t)?dr:ke.current,n=t.contextTypes,o=(n=n!=null)?Ur(e,l):Jt),t=new t(r,o),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=mo,e.stateNode=t,t._reactInternals=e,n&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=o),t}function Cu(e,t,r,n){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(r,n),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(r,n),t.state!==e&&mo.enqueueReplaceState(t,t.state,null)}function Ka(e,t,r,n){var l=e.stateNode;l.props=r,l.state=e.memoizedState,l.refs={},Hi(e);var o=t.contextType;typeof o=="object"&&o!==null?l.context=Je(o):(o=Pe(t)?dr:ke.current,l.context=Ur(e,o)),l.state=e.memoizedState,o=t.getDerivedStateFromProps,typeof o=="function"&&(Qa(e,t,o,r),l.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof l.getSnapshotBeforeUpdate=="function"||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(t=l.state,typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount(),t!==l.state&&mo.enqueueReplaceState(l,l.state,null),Kl(e,r,l,n),l.state=e.memoizedState),typeof l.componentDidMount=="function"&&(e.flags|=4194308)}function Gr(e,t){try{var r="",n=t;do r+=tp(n),n=n.return;while(n);var l=r}catch(o){l=`
Error generating stack: `+o.message+`
`+o.stack}return{value:e,source:t,stack:l,digest:null}}function pa(e,t,r){return{value:e,source:null,stack:r??null,digest:t??null}}function Ja(e,t){try{console.error(t.value)}catch(r){setTimeout(function(){throw r})}}var Lm=typeof WeakMap=="function"?WeakMap:Map;function Dd(e,t,r){r=Et(-1,r),r.tag=3,r.payload={element:null};var n=t.value;return r.callback=function(){to||(to=!0,ii=n),Ja(e,t)},r}function Md(e,t,r){r=Et(-1,r),r.tag=3;var n=e.type.getDerivedStateFromError;if(typeof n=="function"){var l=t.value;r.payload=function(){return n(l)},r.callback=function(){Ja(e,t)}}var o=e.stateNode;return o!==null&&typeof o.componentDidCatch=="function"&&(r.callback=function(){Ja(e,t),typeof n!="function"&&(Yt===null?Yt=new Set([this]):Yt.add(this));var a=t.stack;this.componentDidCatch(t.value,{componentStack:a!==null?a:""})}),r}function Nu(e,t,r){var n=e.pingCache;if(n===null){n=e.pingCache=new Lm;var l=new Set;n.set(t,l)}else l=n.get(t),l===void 0&&(l=new Set,n.set(t,l));l.has(r)||(l.add(r),e=Um.bind(null,e,t,r),t.then(e,e))}function bu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function _u(e,t,r,n,l){return e.mode&1?(e.flags|=65536,e.lanes=l,e):(e===t?e.flags|=65536:(e.flags|=128,r.flags|=131072,r.flags&=-52805,r.tag===1&&(r.alternate===null?r.tag=17:(t=Et(-1,1),t.tag=2,Gt(r,t,1))),r.lanes|=1),e)}var Im=Lt.ReactCurrentOwner,Re=!1;function Ce(e,t,r,n){t.child=e===null?dd(t,null,r,n):$r(t,e.child,r,n)}function Lu(e,t,r,n,l){r=r.render;var o=t.ref;return Ar(t,l),n=Vi(e,t,r,n,o,l),r=Gi(),e!==null&&!Re?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,_t(e,t,l)):(Z&&r&&zi(t),t.flags|=1,Ce(e,t,n,l),t.child)}function Iu(e,t,r,n,l){if(e===null){var o=r.type;return typeof o=="function"&&!rs(o)&&o.defaultProps===void 0&&r.compare===null&&r.defaultProps===void 0?(t.tag=15,t.type=o,Od(e,t,o,n,l)):(e=Fl(r.type,null,n,t,t.mode,l),e.ref=t.ref,e.return=t,t.child=e)}if(o=e.child,!(e.lanes&l)){var a=o.memoizedProps;if(r=r.compare,r=r!==null?r:Dn,r(a,n)&&e.ref===t.ref)return _t(e,t,l)}return t.flags|=1,e=Qt(o,n),e.ref=t.ref,e.return=t,t.child=e}function Od(e,t,r,n,l){if(e!==null){var o=e.memoizedProps;if(Dn(o,n)&&e.ref===t.ref)if(Re=!1,t.pendingProps=n=o,(e.lanes&l)!==0)e.flags&131072&&(Re=!0);else return t.lanes=e.lanes,_t(e,t,l)}return Za(e,t,r,n,l)}function Bd(e,t,r){var n=t.pendingProps,l=n.children,o=e!==null?e.memoizedState:null;if(n.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},Y(zr,De),De|=r;else{if(!(r&1073741824))return e=o!==null?o.baseLanes|r:r,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,Y(zr,De),De|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},n=o!==null?o.baseLanes:r,Y(zr,De),De|=n}else o!==null?(n=o.baseLanes|r,t.memoizedState=null):n=r,Y(zr,De),De|=n;return Ce(e,t,l,r),t.child}function Ad(e,t){var r=t.ref;(e===null&&r!==null||e!==null&&e.ref!==r)&&(t.flags|=512,t.flags|=2097152)}function Za(e,t,r,n,l){var o=Pe(r)?dr:ke.current;return o=Ur(t,o),Ar(t,l),r=Vi(e,t,r,n,o,l),n=Gi(),e!==null&&!Re?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,_t(e,t,l)):(Z&&n&&zi(t),t.flags|=1,Ce(e,t,r,l),t.child)}function Ru(e,t,r,n,l){if(Pe(r)){var o=!0;Vl(t)}else o=!1;if(Ar(t,l),t.stateNode===null)Tl(e,t),Fd(t,r,n),Ka(t,r,n,l),n=!0;else if(e===null){var a=t.stateNode,i=t.memoizedProps;a.props=i;var s=a.context,c=r.contextType;typeof c=="object"&&c!==null?c=Je(c):(c=Pe(r)?dr:ke.current,c=Ur(t,c));var h=r.getDerivedStateFromProps,v=typeof h=="function"||typeof a.getSnapshotBeforeUpdate=="function";v||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(i!==n||s!==c)&&Cu(t,a,n,c),Mt=!1;var g=t.memoizedState;a.state=g,Kl(t,n,a,l),s=t.memoizedState,i!==n||g!==s||Te.current||Mt?(typeof h=="function"&&(Qa(t,r,h,n),s=t.memoizedState),(i=Mt||Eu(t,r,i,n,g,s,c))?(v||typeof a.UNSAFE_componentWillMount!="function"&&typeof a.componentWillMount!="function"||(typeof a.componentWillMount=="function"&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount=="function"&&a.UNSAFE_componentWillMount()),typeof a.componentDidMount=="function"&&(t.flags|=4194308)):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=n,t.memoizedState=s),a.props=n,a.state=s,a.context=c,n=i):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),n=!1)}else{a=t.stateNode,pd(e,t),i=t.memoizedProps,c=t.type===t.elementType?i:rt(t.type,i),a.props=c,v=t.pendingProps,g=a.context,s=r.contextType,typeof s=="object"&&s!==null?s=Je(s):(s=Pe(r)?dr:ke.current,s=Ur(t,s));var w=r.getDerivedStateFromProps;(h=typeof w=="function"||typeof a.getSnapshotBeforeUpdate=="function")||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(i!==v||g!==s)&&Cu(t,a,n,s),Mt=!1,g=t.memoizedState,a.state=g,Kl(t,n,a,l);var E=t.memoizedState;i!==v||g!==E||Te.current||Mt?(typeof w=="function"&&(Qa(t,r,w,n),E=t.memoizedState),(c=Mt||Eu(t,r,c,n,g,E,s)||!1)?(h||typeof a.UNSAFE_componentWillUpdate!="function"&&typeof a.componentWillUpdate!="function"||(typeof a.componentWillUpdate=="function"&&a.componentWillUpdate(n,E,s),typeof a.UNSAFE_componentWillUpdate=="function"&&a.UNSAFE_componentWillUpdate(n,E,s)),typeof a.componentDidUpdate=="function"&&(t.flags|=4),typeof a.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof a.componentDidUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=1024),t.memoizedProps=n,t.memoizedState=E),a.props=n,a.state=E,a.context=s,n=c):(typeof a.componentDidUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=1024),n=!1)}return qa(e,t,r,n,o,l)}function qa(e,t,r,n,l,o){Ad(e,t);var a=(t.flags&128)!==0;if(!n&&!a)return l&&gu(t,r,!1),_t(e,t,o);n=t.stateNode,Im.current=t;var i=a&&typeof r.getDerivedStateFromError!="function"?null:n.render();return t.flags|=1,e!==null&&a?(t.child=$r(t,e.child,null,o),t.child=$r(t,null,i,o)):Ce(e,t,i,o),t.memoizedState=n.state,l&&gu(t,r,!0),t.child}function Hd(e){var t=e.stateNode;t.pendingContext?mu(e,t.pendingContext,t.pendingContext!==t.context):t.context&&mu(e,t.context,!1),ji(e,t.containerInfo)}function Tu(e,t,r,n,l){return Wr(),Di(l),t.flags|=256,Ce(e,t,r,n),t.child}var ei={dehydrated:null,treeContext:null,retryLane:0};function ti(e){return{baseLanes:e,cachePool:null,transitions:null}}function jd(e,t,r){var n=t.pendingProps,l=q.current,o=!1,a=(t.flags&128)!==0,i;if((i=a)||(i=e!==null&&e.memoizedState===null?!1:(l&2)!==0),i?(o=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(l|=1),Y(q,l&1),e===null)return Ya(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(a=n.children,e=n.fallback,o?(n=t.mode,o=t.child,a={mode:"hidden",children:a},!(n&1)&&o!==null?(o.childLanes=0,o.pendingProps=a):o=vo(a,n,0,null),e=ur(e,n,r,null),o.return=t,e.return=t,o.sibling=e,t.child=o,t.child.memoizedState=ti(r),t.memoizedState=ei,e):Qi(t,a));if(l=e.memoizedState,l!==null&&(i=l.dehydrated,i!==null))return Rm(e,t,a,n,i,l,r);if(o){o=n.fallback,a=t.mode,l=e.child,i=l.sibling;var s={mode:"hidden",children:n.children};return!(a&1)&&t.child!==l?(n=t.child,n.childLanes=0,n.pendingProps=s,t.deletions=null):(n=Qt(l,s),n.subtreeFlags=l.subtreeFlags&14680064),i!==null?o=Qt(i,o):(o=ur(o,a,r,null),o.flags|=2),o.return=t,n.return=t,n.sibling=o,t.child=n,n=o,o=t.child,a=e.child.memoizedState,a=a===null?ti(r):{baseLanes:a.baseLanes|r,cachePool:null,transitions:a.transitions},o.memoizedState=a,o.childLanes=e.childLanes&~r,t.memoizedState=ei,n}return o=e.child,e=o.sibling,n=Qt(o,{mode:"visible",children:n.children}),!(t.mode&1)&&(n.lanes=r),n.return=t,n.sibling=null,e!==null&&(r=t.deletions,r===null?(t.deletions=[e],t.flags|=16):r.push(e)),t.child=n,t.memoizedState=null,n}function Qi(e,t){return t=vo({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function xl(e,t,r,n){return n!==null&&Di(n),$r(t,e.child,null,r),e=Qi(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Rm(e,t,r,n,l,o,a){if(r)return t.flags&256?(t.flags&=-257,n=pa(Error(S(422))),xl(e,t,a,n)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(o=n.fallback,l=t.mode,n=vo({mode:"visible",children:n.children},l,0,null),o=ur(o,l,a,null),o.flags|=2,n.return=t,o.return=t,n.sibling=o,t.child=n,t.mode&1&&$r(t,e.child,null,a),t.child.memoizedState=ti(a),t.memoizedState=ei,o);if(!(t.mode&1))return xl(e,t,a,null);if(l.data==="$!"){if(n=l.nextSibling&&l.nextSibling.dataset,n)var i=n.dgst;return n=i,o=Error(S(419)),n=pa(o,n,void 0),xl(e,t,a,n)}if(i=(a&e.childLanes)!==0,Re||i){if(n=pe,n!==null){switch(a&-a){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=l&(n.suspendedLanes|a)?0:l,l!==0&&l!==o.retryLane&&(o.retryLane=l,bt(e,l),at(n,e,l,-1))}return ts(),n=pa(Error(S(421))),xl(e,t,a,n)}return l.data==="$?"?(t.flags|=128,t.child=e.child,t=Wm.bind(null,e),l._reactRetry=t,null):(e=o.treeContext,Oe=Vt(l.nextSibling),Be=t,Z=!0,lt=null,e!==null&&(Ye[Xe++]=kt,Ye[Xe++]=St,Ye[Xe++]=fr,kt=e.id,St=e.overflow,fr=t),t=Qi(t,n.children),t.flags|=4096,t)}function Pu(e,t,r){e.lanes|=t;var n=e.alternate;n!==null&&(n.lanes|=t),Xa(e.return,t,r)}function ma(e,t,r,n,l){var o=e.memoizedState;o===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:n,tail:r,tailMode:l}:(o.isBackwards=t,o.rendering=null,o.renderingStartTime=0,o.last=n,o.tail=r,o.tailMode=l)}function Ud(e,t,r){var n=t.pendingProps,l=n.revealOrder,o=n.tail;if(Ce(e,t,n.children,r),n=q.current,n&2)n=n&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Pu(e,r,t);else if(e.tag===19)Pu(e,r,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}n&=1}if(Y(q,n),!(t.mode&1))t.memoizedState=null;else switch(l){case"forwards":for(r=t.child,l=null;r!==null;)e=r.alternate,e!==null&&Jl(e)===null&&(l=r),r=r.sibling;r=l,r===null?(l=t.child,t.child=null):(l=r.sibling,r.sibling=null),ma(t,!1,l,r,o);break;case"backwards":for(r=null,l=t.child,t.child=null;l!==null;){if(e=l.alternate,e!==null&&Jl(e)===null){t.child=l;break}e=l.sibling,l.sibling=r,r=l,l=e}ma(t,!0,r,null,o);break;case"together":ma(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function Tl(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function _t(e,t,r){if(e!==null&&(t.dependencies=e.dependencies),mr|=t.lanes,!(r&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(S(153));if(t.child!==null){for(e=t.child,r=Qt(e,e.pendingProps),t.child=r,r.return=t;e.sibling!==null;)e=e.sibling,r=r.sibling=Qt(e,e.pendingProps),r.return=t;r.sibling=null}return t.child}function Tm(e,t,r){switch(t.tag){case 3:Hd(t),Wr();break;case 5:md(t);break;case 1:Pe(t.type)&&Vl(t);break;case 4:ji(t,t.stateNode.containerInfo);break;case 10:var n=t.type._context,l=t.memoizedProps.value;Y(Xl,n._currentValue),n._currentValue=l;break;case 13:if(n=t.memoizedState,n!==null)return n.dehydrated!==null?(Y(q,q.current&1),t.flags|=128,null):r&t.child.childLanes?jd(e,t,r):(Y(q,q.current&1),e=_t(e,t,r),e!==null?e.sibling:null);Y(q,q.current&1);break;case 19:if(n=(r&t.childLanes)!==0,e.flags&128){if(n)return Ud(e,t,r);t.flags|=128}if(l=t.memoizedState,l!==null&&(l.rendering=null,l.tail=null,l.lastEffect=null),Y(q,q.current),n)break;return null;case 22:case 23:return t.lanes=0,Bd(e,t,r)}return _t(e,t,r)}var Wd,ri,$d,Vd;Wd=function(e,t){for(var r=t.child;r!==null;){if(r.tag===5||r.tag===6)e.appendChild(r.stateNode);else if(r.tag!==4&&r.child!==null){r.child.return=r,r=r.child;continue}if(r===t)break;for(;r.sibling===null;){if(r.return===null||r.return===t)return;r=r.return}r.sibling.return=r.return,r=r.sibling}};ri=function(){};$d=function(e,t,r,n){var l=e.memoizedProps;if(l!==n){e=t.stateNode,ir(pt.current);var o=null;switch(r){case"input":l=Ca(e,l),n=Ca(e,n),o=[];break;case"select":l=te({},l,{value:void 0}),n=te({},n,{value:void 0}),o=[];break;case"textarea":l=_a(e,l),n=_a(e,n),o=[];break;default:typeof l.onClick!="function"&&typeof n.onClick=="function"&&(e.onclick=Wl)}Ia(r,n);var a;r=null;for(c in l)if(!n.hasOwnProperty(c)&&l.hasOwnProperty(c)&&l[c]!=null)if(c==="style"){var i=l[c];for(a in i)i.hasOwnProperty(a)&&(r||(r={}),r[a]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Ln.hasOwnProperty(c)?o||(o=[]):(o=o||[]).push(c,null));for(c in n){var s=n[c];if(i=l!=null?l[c]:void 0,n.hasOwnProperty(c)&&s!==i&&(s!=null||i!=null))if(c==="style")if(i){for(a in i)!i.hasOwnProperty(a)||s&&s.hasOwnProperty(a)||(r||(r={}),r[a]="");for(a in s)s.hasOwnProperty(a)&&i[a]!==s[a]&&(r||(r={}),r[a]=s[a])}else r||(o||(o=[]),o.push(c,r)),r=s;else c==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,i=i?i.__html:void 0,s!=null&&i!==s&&(o=o||[]).push(c,s)):c==="children"?typeof s!="string"&&typeof s!="number"||(o=o||[]).push(c,""+s):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Ln.hasOwnProperty(c)?(s!=null&&c==="onScroll"&&Q("scroll",e),o||i===s||(o=[])):(o=o||[]).push(c,s))}r&&(o=o||[]).push("style",r);var c=o;(t.updateQueue=c)&&(t.flags|=4)}};Vd=function(e,t,r,n){r!==n&&(t.flags|=4)};function un(e,t){if(!Z)switch(e.tailMode){case"hidden":t=e.tail;for(var r=null;t!==null;)t.alternate!==null&&(r=t),t=t.sibling;r===null?e.tail=null:r.sibling=null;break;case"collapsed":r=e.tail;for(var n=null;r!==null;)r.alternate!==null&&(n=r),r=r.sibling;n===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:n.sibling=null}}function xe(e){var t=e.alternate!==null&&e.alternate.child===e.child,r=0,n=0;if(t)for(var l=e.child;l!==null;)r|=l.lanes|l.childLanes,n|=l.subtreeFlags&14680064,n|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;l!==null;)r|=l.lanes|l.childLanes,n|=l.subtreeFlags,n|=l.flags,l.return=e,l=l.sibling;return e.subtreeFlags|=n,e.childLanes=r,t}function Pm(e,t,r){var n=t.pendingProps;switch(Fi(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return xe(t),null;case 1:return Pe(t.type)&&$l(),xe(t),null;case 3:return n=t.stateNode,Vr(),K(Te),K(ke),Wi(),n.pendingContext&&(n.context=n.pendingContext,n.pendingContext=null),(e===null||e.child===null)&&(vl(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,lt!==null&&(ci(lt),lt=null))),ri(e,t),xe(t),null;case 5:Ui(t);var l=ir(Hn.current);if(r=t.type,e!==null&&t.stateNode!=null)$d(e,t,r,n,l),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!n){if(t.stateNode===null)throw Error(S(166));return xe(t),null}if(e=ir(pt.current),vl(t)){n=t.stateNode,r=t.type;var o=t.memoizedProps;switch(n[dt]=t,n[Bn]=o,e=(t.mode&1)!==0,r){case"dialog":Q("cancel",n),Q("close",n);break;case"iframe":case"object":case"embed":Q("load",n);break;case"video":case"audio":for(l=0;l<hn.length;l++)Q(hn[l],n);break;case"source":Q("error",n);break;case"img":case"image":case"link":Q("error",n),Q("load",n);break;case"details":Q("toggle",n);break;case"input":js(n,o),Q("invalid",n);break;case"select":n._wrapperState={wasMultiple:!!o.multiple},Q("invalid",n);break;case"textarea":Ws(n,o),Q("invalid",n)}Ia(r,o),l=null;for(var a in o)if(o.hasOwnProperty(a)){var i=o[a];a==="children"?typeof i=="string"?n.textContent!==i&&(o.suppressHydrationWarning!==!0&&hl(n.textContent,i,e),l=["children",i]):typeof i=="number"&&n.textContent!==""+i&&(o.suppressHydrationWarning!==!0&&hl(n.textContent,i,e),l=["children",""+i]):Ln.hasOwnProperty(a)&&i!=null&&a==="onScroll"&&Q("scroll",n)}switch(r){case"input":sl(n),Us(n,o,!0);break;case"textarea":sl(n),$s(n);break;case"select":case"option":break;default:typeof o.onClick=="function"&&(n.onclick=Wl)}n=l,t.updateQueue=n,n!==null&&(t.flags|=4)}else{a=l.nodeType===9?l:l.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=xc(r)),e==="http://www.w3.org/1999/xhtml"?r==="script"?(e=a.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof n.is=="string"?e=a.createElement(r,{is:n.is}):(e=a.createElement(r),r==="select"&&(a=e,n.multiple?a.multiple=!0:n.size&&(a.size=n.size))):e=a.createElementNS(e,r),e[dt]=t,e[Bn]=n,Wd(e,t,!1,!1),t.stateNode=e;e:{switch(a=Ra(r,n),r){case"dialog":Q("cancel",e),Q("close",e),l=n;break;case"iframe":case"object":case"embed":Q("load",e),l=n;break;case"video":case"audio":for(l=0;l<hn.length;l++)Q(hn[l],e);l=n;break;case"source":Q("error",e),l=n;break;case"img":case"image":case"link":Q("error",e),Q("load",e),l=n;break;case"details":Q("toggle",e),l=n;break;case"input":js(e,n),l=Ca(e,n),Q("invalid",e);break;case"option":l=n;break;case"select":e._wrapperState={wasMultiple:!!n.multiple},l=te({},n,{value:void 0}),Q("invalid",e);break;case"textarea":Ws(e,n),l=_a(e,n),Q("invalid",e);break;default:l=n}Ia(r,l),i=l;for(o in i)if(i.hasOwnProperty(o)){var s=i[o];o==="style"?Sc(e,s):o==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,s!=null&&wc(e,s)):o==="children"?typeof s=="string"?(r!=="textarea"||s!=="")&&In(e,s):typeof s=="number"&&In(e,""+s):o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&o!=="autoFocus"&&(Ln.hasOwnProperty(o)?s!=null&&o==="onScroll"&&Q("scroll",e):s!=null&&xi(e,o,s,a))}switch(r){case"input":sl(e),Us(e,n,!1);break;case"textarea":sl(e),$s(e);break;case"option":n.value!=null&&e.setAttribute("value",""+Kt(n.value));break;case"select":e.multiple=!!n.multiple,o=n.value,o!=null?Dr(e,!!n.multiple,o,!1):n.defaultValue!=null&&Dr(e,!!n.multiple,n.defaultValue,!0);break;default:typeof l.onClick=="function"&&(e.onclick=Wl)}switch(r){case"button":case"input":case"select":case"textarea":n=!!n.autoFocus;break e;case"img":n=!0;break e;default:n=!1}}n&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return xe(t),null;case 6:if(e&&t.stateNode!=null)Vd(e,t,e.memoizedProps,n);else{if(typeof n!="string"&&t.stateNode===null)throw Error(S(166));if(r=ir(Hn.current),ir(pt.current),vl(t)){if(n=t.stateNode,r=t.memoizedProps,n[dt]=t,(o=n.nodeValue!==r)&&(e=Be,e!==null))switch(e.tag){case 3:hl(n.nodeValue,r,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&hl(n.nodeValue,r,(e.mode&1)!==0)}o&&(t.flags|=4)}else n=(r.nodeType===9?r:r.ownerDocument).createTextNode(n),n[dt]=t,t.stateNode=n}return xe(t),null;case 13:if(K(q),n=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Z&&Oe!==null&&t.mode&1&&!(t.flags&128))ud(),Wr(),t.flags|=98560,o=!1;else if(o=vl(t),n!==null&&n.dehydrated!==null){if(e===null){if(!o)throw Error(S(318));if(o=t.memoizedState,o=o!==null?o.dehydrated:null,!o)throw Error(S(317));o[dt]=t}else Wr(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;xe(t),o=!1}else lt!==null&&(ci(lt),lt=null),o=!0;if(!o)return t.flags&65536?t:null}return t.flags&128?(t.lanes=r,t):(n=n!==null,n!==(e!==null&&e.memoizedState!==null)&&n&&(t.child.flags|=8192,t.mode&1&&(e===null||q.current&1?de===0&&(de=3):ts())),t.updateQueue!==null&&(t.flags|=4),xe(t),null);case 4:return Vr(),ri(e,t),e===null&&Mn(t.stateNode.containerInfo),xe(t),null;case 10:return Bi(t.type._context),xe(t),null;case 17:return Pe(t.type)&&$l(),xe(t),null;case 19:if(K(q),o=t.memoizedState,o===null)return xe(t),null;if(n=(t.flags&128)!==0,a=o.rendering,a===null)if(n)un(o,!1);else{if(de!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(a=Jl(e),a!==null){for(t.flags|=128,un(o,!1),n=a.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),t.subtreeFlags=0,n=r,r=t.child;r!==null;)o=r,e=n,o.flags&=14680066,a=o.alternate,a===null?(o.childLanes=0,o.lanes=e,o.child=null,o.subtreeFlags=0,o.memoizedProps=null,o.memoizedState=null,o.updateQueue=null,o.dependencies=null,o.stateNode=null):(o.childLanes=a.childLanes,o.lanes=a.lanes,o.child=a.child,o.subtreeFlags=0,o.deletions=null,o.memoizedProps=a.memoizedProps,o.memoizedState=a.memoizedState,o.updateQueue=a.updateQueue,o.type=a.type,e=a.dependencies,o.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),r=r.sibling;return Y(q,q.current&1|2),t.child}e=e.sibling}o.tail!==null&&ae()>Yr&&(t.flags|=128,n=!0,un(o,!1),t.lanes=4194304)}else{if(!n)if(e=Jl(a),e!==null){if(t.flags|=128,n=!0,r=e.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),un(o,!0),o.tail===null&&o.tailMode==="hidden"&&!a.alternate&&!Z)return xe(t),null}else 2*ae()-o.renderingStartTime>Yr&&r!==1073741824&&(t.flags|=128,n=!0,un(o,!1),t.lanes=4194304);o.isBackwards?(a.sibling=t.child,t.child=a):(r=o.last,r!==null?r.sibling=a:t.child=a,o.last=a)}return o.tail!==null?(t=o.tail,o.rendering=t,o.tail=t.sibling,o.renderingStartTime=ae(),t.sibling=null,r=q.current,Y(q,n?r&1|2:r&1),t):(xe(t),null);case 22:case 23:return es(),n=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==n&&(t.flags|=8192),n&&t.mode&1?De&1073741824&&(xe(t),t.subtreeFlags&6&&(t.flags|=8192)):xe(t),null;case 24:return null;case 25:return null}throw Error(S(156,t.tag))}function zm(e,t){switch(Fi(t),t.tag){case 1:return Pe(t.type)&&$l(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Vr(),K(Te),K(ke),Wi(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return Ui(t),null;case 13:if(K(q),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(S(340));Wr()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return K(q),null;case 4:return Vr(),null;case 10:return Bi(t.type._context),null;case 22:case 23:return es(),null;case 24:return null;default:return null}}var wl=!1,we=!1,Fm=typeof WeakSet=="function"?WeakSet:Set,L=null;function Pr(e,t){var r=e.ref;if(r!==null)if(typeof r=="function")try{r(null)}catch(n){ne(e,t,n)}else r.current=null}function ni(e,t,r){try{r()}catch(n){ne(e,t,n)}}var zu=!1;function Dm(e,t){if(Ha=Hl,e=Kc(),Pi(e)){if("selectionStart"in e)var r={start:e.selectionStart,end:e.selectionEnd};else e:{r=(r=e.ownerDocument)&&r.defaultView||window;var n=r.getSelection&&r.getSelection();if(n&&n.rangeCount!==0){r=n.anchorNode;var l=n.anchorOffset,o=n.focusNode;n=n.focusOffset;try{r.nodeType,o.nodeType}catch{r=null;break e}var a=0,i=-1,s=-1,c=0,h=0,v=e,g=null;t:for(;;){for(var w;v!==r||l!==0&&v.nodeType!==3||(i=a+l),v!==o||n!==0&&v.nodeType!==3||(s=a+n),v.nodeType===3&&(a+=v.nodeValue.length),(w=v.firstChild)!==null;)g=v,v=w;for(;;){if(v===e)break t;if(g===r&&++c===l&&(i=a),g===o&&++h===n&&(s=a),(w=v.nextSibling)!==null)break;v=g,g=v.parentNode}v=w}r=i===-1||s===-1?null:{start:i,end:s}}else r=null}r=r||{start:0,end:0}}else r=null;for(ja={focusedElem:e,selectionRange:r},Hl=!1,L=t;L!==null;)if(t=L,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,L=e;else for(;L!==null;){t=L;try{var E=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(E!==null){var x=E.memoizedProps,j=E.memoizedState,f=t.stateNode,d=f.getSnapshotBeforeUpdate(t.elementType===t.type?x:rt(t.type,x),j);f.__reactInternalSnapshotBeforeUpdate=d}break;case 3:var m=t.stateNode.containerInfo;m.nodeType===1?m.textContent="":m.nodeType===9&&m.documentElement&&m.removeChild(m.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(S(163))}}catch(k){ne(t,t.return,k)}if(e=t.sibling,e!==null){e.return=t.return,L=e;break}L=t.return}return E=zu,zu=!1,E}function Cn(e,t,r){var n=t.updateQueue;if(n=n!==null?n.lastEffect:null,n!==null){var l=n=n.next;do{if((l.tag&e)===e){var o=l.destroy;l.destroy=void 0,o!==void 0&&ni(t,r,o)}l=l.next}while(l!==n)}}function go(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var r=t=t.next;do{if((r.tag&e)===e){var n=r.create;r.destroy=n()}r=r.next}while(r!==t)}}function li(e){var t=e.ref;if(t!==null){var r=e.stateNode;switch(e.tag){case 5:e=r;break;default:e=r}typeof t=="function"?t(e):t.current=e}}function Gd(e){var t=e.alternate;t!==null&&(e.alternate=null,Gd(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[dt],delete t[Bn],delete t[$a],delete t[vm],delete t[ym])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function Yd(e){return e.tag===5||e.tag===3||e.tag===4}function Fu(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||Yd(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function oi(e,t,r){var n=e.tag;if(n===5||n===6)e=e.stateNode,t?r.nodeType===8?r.parentNode.insertBefore(e,t):r.insertBefore(e,t):(r.nodeType===8?(t=r.parentNode,t.insertBefore(e,r)):(t=r,t.appendChild(e)),r=r._reactRootContainer,r!=null||t.onclick!==null||(t.onclick=Wl));else if(n!==4&&(e=e.child,e!==null))for(oi(e,t,r),e=e.sibling;e!==null;)oi(e,t,r),e=e.sibling}function ai(e,t,r){var n=e.tag;if(n===5||n===6)e=e.stateNode,t?r.insertBefore(e,t):r.appendChild(e);else if(n!==4&&(e=e.child,e!==null))for(ai(e,t,r),e=e.sibling;e!==null;)ai(e,t,r),e=e.sibling}var ge=null,nt=!1;function Ft(e,t,r){for(r=r.child;r!==null;)Xd(e,t,r),r=r.sibling}function Xd(e,t,r){if(ft&&typeof ft.onCommitFiberUnmount=="function")try{ft.onCommitFiberUnmount(ao,r)}catch{}switch(r.tag){case 5:we||Pr(r,t);case 6:var n=ge,l=nt;ge=null,Ft(e,t,r),ge=n,nt=l,ge!==null&&(nt?(e=ge,r=r.stateNode,e.nodeType===8?e.parentNode.removeChild(r):e.removeChild(r)):ge.removeChild(r.stateNode));break;case 18:ge!==null&&(nt?(e=ge,r=r.stateNode,e.nodeType===8?ia(e.parentNode,r):e.nodeType===1&&ia(e,r),zn(e)):ia(ge,r.stateNode));break;case 4:n=ge,l=nt,ge=r.stateNode.containerInfo,nt=!0,Ft(e,t,r),ge=n,nt=l;break;case 0:case 11:case 14:case 15:if(!we&&(n=r.updateQueue,n!==null&&(n=n.lastEffect,n!==null))){l=n=n.next;do{var o=l,a=o.destroy;o=o.tag,a!==void 0&&(o&2||o&4)&&ni(r,t,a),l=l.next}while(l!==n)}Ft(e,t,r);break;case 1:if(!we&&(Pr(r,t),n=r.stateNode,typeof n.componentWillUnmount=="function"))try{n.props=r.memoizedProps,n.state=r.memoizedState,n.componentWillUnmount()}catch(i){ne(r,t,i)}Ft(e,t,r);break;case 21:Ft(e,t,r);break;case 22:r.mode&1?(we=(n=we)||r.memoizedState!==null,Ft(e,t,r),we=n):Ft(e,t,r);break;default:Ft(e,t,r)}}function Du(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var r=e.stateNode;r===null&&(r=e.stateNode=new Fm),t.forEach(function(n){var l=$m.bind(null,e,n);r.has(n)||(r.add(n),n.then(l,l))})}}function et(e,t){var r=t.deletions;if(r!==null)for(var n=0;n<r.length;n++){var l=r[n];try{var o=e,a=t,i=a;e:for(;i!==null;){switch(i.tag){case 5:ge=i.stateNode,nt=!1;break e;case 3:ge=i.stateNode.containerInfo,nt=!0;break e;case 4:ge=i.stateNode.containerInfo,nt=!0;break e}i=i.return}if(ge===null)throw Error(S(160));Xd(o,a,l),ge=null,nt=!1;var s=l.alternate;s!==null&&(s.return=null),l.return=null}catch(c){ne(l,t,c)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Qd(t,e),t=t.sibling}function Qd(e,t){var r=e.alternate,n=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(et(t,e),st(e),n&4){try{Cn(3,e,e.return),go(3,e)}catch(x){ne(e,e.return,x)}try{Cn(5,e,e.return)}catch(x){ne(e,e.return,x)}}break;case 1:et(t,e),st(e),n&512&&r!==null&&Pr(r,r.return);break;case 5:if(et(t,e),st(e),n&512&&r!==null&&Pr(r,r.return),e.flags&32){var l=e.stateNode;try{In(l,"")}catch(x){ne(e,e.return,x)}}if(n&4&&(l=e.stateNode,l!=null)){var o=e.memoizedProps,a=r!==null?r.memoizedProps:o,i=e.type,s=e.updateQueue;if(e.updateQueue=null,s!==null)try{i==="input"&&o.type==="radio"&&o.name!=null&&vc(l,o),Ra(i,a);var c=Ra(i,o);for(a=0;a<s.length;a+=2){var h=s[a],v=s[a+1];h==="style"?Sc(l,v):h==="dangerouslySetInnerHTML"?wc(l,v):h==="children"?In(l,v):xi(l,h,v,c)}switch(i){case"input":Na(l,o);break;case"textarea":yc(l,o);break;case"select":var g=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!o.multiple;var w=o.value;w!=null?Dr(l,!!o.multiple,w,!1):g!==!!o.multiple&&(o.defaultValue!=null?Dr(l,!!o.multiple,o.defaultValue,!0):Dr(l,!!o.multiple,o.multiple?[]:"",!1))}l[Bn]=o}catch(x){ne(e,e.return,x)}}break;case 6:if(et(t,e),st(e),n&4){if(e.stateNode===null)throw Error(S(162));l=e.stateNode,o=e.memoizedProps;try{l.nodeValue=o}catch(x){ne(e,e.return,x)}}break;case 3:if(et(t,e),st(e),n&4&&r!==null&&r.memoizedState.isDehydrated)try{zn(t.containerInfo)}catch(x){ne(e,e.return,x)}break;case 4:et(t,e),st(e);break;case 13:et(t,e),st(e),l=e.child,l.flags&8192&&(o=l.memoizedState!==null,l.stateNode.isHidden=o,!o||l.alternate!==null&&l.alternate.memoizedState!==null||(Zi=ae())),n&4&&Du(e);break;case 22:if(h=r!==null&&r.memoizedState!==null,e.mode&1?(we=(c=we)||h,et(t,e),we=c):et(t,e),st(e),n&8192){if(c=e.memoizedState!==null,(e.stateNode.isHidden=c)&&!h&&e.mode&1)for(L=e,h=e.child;h!==null;){for(v=L=h;L!==null;){switch(g=L,w=g.child,g.tag){case 0:case 11:case 14:case 15:Cn(4,g,g.return);break;case 1:Pr(g,g.return);var E=g.stateNode;if(typeof E.componentWillUnmount=="function"){n=g,r=g.return;try{t=n,E.props=t.memoizedProps,E.state=t.memoizedState,E.componentWillUnmount()}catch(x){ne(n,r,x)}}break;case 5:Pr(g,g.return);break;case 22:if(g.memoizedState!==null){Ou(v);continue}}w!==null?(w.return=g,L=w):Ou(v)}h=h.sibling}e:for(h=null,v=e;;){if(v.tag===5){if(h===null){h=v;try{l=v.stateNode,c?(o=l.style,typeof o.setProperty=="function"?o.setProperty("display","none","important"):o.display="none"):(i=v.stateNode,s=v.memoizedProps.style,a=s!=null&&s.hasOwnProperty("display")?s.display:null,i.style.display=kc("display",a))}catch(x){ne(e,e.return,x)}}}else if(v.tag===6){if(h===null)try{v.stateNode.nodeValue=c?"":v.memoizedProps}catch(x){ne(e,e.return,x)}}else if((v.tag!==22&&v.tag!==23||v.memoizedState===null||v===e)&&v.child!==null){v.child.return=v,v=v.child;continue}if(v===e)break e;for(;v.sibling===null;){if(v.return===null||v.return===e)break e;h===v&&(h=null),v=v.return}h===v&&(h=null),v.sibling.return=v.return,v=v.sibling}}break;case 19:et(t,e),st(e),n&4&&Du(e);break;case 21:break;default:et(t,e),st(e)}}function st(e){var t=e.flags;if(t&2){try{e:{for(var r=e.return;r!==null;){if(Yd(r)){var n=r;break e}r=r.return}throw Error(S(160))}switch(n.tag){case 5:var l=n.stateNode;n.flags&32&&(In(l,""),n.flags&=-33);var o=Fu(e);ai(e,o,l);break;case 3:case 4:var a=n.stateNode.containerInfo,i=Fu(e);oi(e,i,a);break;default:throw Error(S(161))}}catch(s){ne(e,e.return,s)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function Mm(e,t,r){L=e,Kd(e)}function Kd(e,t,r){for(var n=(e.mode&1)!==0;L!==null;){var l=L,o=l.child;if(l.tag===22&&n){var a=l.memoizedState!==null||wl;if(!a){var i=l.alternate,s=i!==null&&i.memoizedState!==null||we;i=wl;var c=we;if(wl=a,(we=s)&&!c)for(L=l;L!==null;)a=L,s=a.child,a.tag===22&&a.memoizedState!==null?Bu(l):s!==null?(s.return=a,L=s):Bu(l);for(;o!==null;)L=o,Kd(o),o=o.sibling;L=l,wl=i,we=c}Mu(e)}else l.subtreeFlags&8772&&o!==null?(o.return=l,L=o):Mu(e)}}function Mu(e){for(;L!==null;){var t=L;if(t.flags&8772){var r=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:we||go(5,t);break;case 1:var n=t.stateNode;if(t.flags&4&&!we)if(r===null)n.componentDidMount();else{var l=t.elementType===t.type?r.memoizedProps:rt(t.type,r.memoizedProps);n.componentDidUpdate(l,r.memoizedState,n.__reactInternalSnapshotBeforeUpdate)}var o=t.updateQueue;o!==null&&wu(t,o,n);break;case 3:var a=t.updateQueue;if(a!==null){if(r=null,t.child!==null)switch(t.child.tag){case 5:r=t.child.stateNode;break;case 1:r=t.child.stateNode}wu(t,a,r)}break;case 5:var i=t.stateNode;if(r===null&&t.flags&4){r=i;var s=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":s.autoFocus&&r.focus();break;case"img":s.src&&(r.src=s.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var c=t.alternate;if(c!==null){var h=c.memoizedState;if(h!==null){var v=h.dehydrated;v!==null&&zn(v)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(S(163))}we||t.flags&512&&li(t)}catch(g){ne(t,t.return,g)}}if(t===e){L=null;break}if(r=t.sibling,r!==null){r.return=t.return,L=r;break}L=t.return}}function Ou(e){for(;L!==null;){var t=L;if(t===e){L=null;break}var r=t.sibling;if(r!==null){r.return=t.return,L=r;break}L=t.return}}function Bu(e){for(;L!==null;){var t=L;try{switch(t.tag){case 0:case 11:case 15:var r=t.return;try{go(4,t)}catch(s){ne(t,r,s)}break;case 1:var n=t.stateNode;if(typeof n.componentDidMount=="function"){var l=t.return;try{n.componentDidMount()}catch(s){ne(t,l,s)}}var o=t.return;try{li(t)}catch(s){ne(t,o,s)}break;case 5:var a=t.return;try{li(t)}catch(s){ne(t,a,s)}}}catch(s){ne(t,t.return,s)}if(t===e){L=null;break}var i=t.sibling;if(i!==null){i.return=t.return,L=i;break}L=t.return}}var Om=Math.ceil,eo=Lt.ReactCurrentDispatcher,Ki=Lt.ReactCurrentOwner,Ke=Lt.ReactCurrentBatchConfig,W=0,pe=null,ue=null,he=0,De=0,zr=qt(0),de=0,$n=null,mr=0,ho=0,Ji=0,Nn=null,Ie=null,Zi=0,Yr=1/0,xt=null,to=!1,ii=null,Yt=null,kl=!1,jt=null,ro=0,bn=0,si=null,Pl=-1,zl=0;function Ne(){return W&6?ae():Pl!==-1?Pl:Pl=ae()}function Xt(e){return e.mode&1?W&2&&he!==0?he&-he:wm.transition!==null?(zl===0&&(zl=Fc()),zl):(e=G,e!==0||(e=window.event,e=e===void 0?16:jc(e.type)),e):1}function at(e,t,r,n){if(50<bn)throw bn=0,si=null,Error(S(185));Gn(e,r,n),(!(W&2)||e!==pe)&&(e===pe&&(!(W&2)&&(ho|=r),de===4&&At(e,he)),ze(e,n),r===1&&W===0&&!(t.mode&1)&&(Yr=ae()+500,fo&&er()))}function ze(e,t){var r=e.callbackNode;wp(e,t);var n=Al(e,e===pe?he:0);if(n===0)r!==null&&Ys(r),e.callbackNode=null,e.callbackPriority=0;else if(t=n&-n,e.callbackPriority!==t){if(r!=null&&Ys(r),t===1)e.tag===0?xm(Au.bind(null,e)):ad(Au.bind(null,e)),gm(function(){!(W&6)&&er()}),r=null;else{switch(Dc(n)){case 1:r=Ci;break;case 4:r=Pc;break;case 16:r=Bl;break;case 536870912:r=zc;break;default:r=Bl}r=lf(r,Jd.bind(null,e))}e.callbackPriority=t,e.callbackNode=r}}function Jd(e,t){if(Pl=-1,zl=0,W&6)throw Error(S(327));var r=e.callbackNode;if(Hr()&&e.callbackNode!==r)return null;var n=Al(e,e===pe?he:0);if(n===0)return null;if(n&30||n&e.expiredLanes||t)t=no(e,n);else{t=n;var l=W;W|=2;var o=qd();(pe!==e||he!==t)&&(xt=null,Yr=ae()+500,sr(e,t));do try{Hm();break}catch(i){Zd(e,i)}while(!0);Oi(),eo.current=o,W=l,ue!==null?t=0:(pe=null,he=0,t=de)}if(t!==0){if(t===2&&(l=Da(e),l!==0&&(n=l,t=ui(e,l))),t===1)throw r=$n,sr(e,0),At(e,n),ze(e,ae()),r;if(t===6)At(e,n);else{if(l=e.current.alternate,!(n&30)&&!Bm(l)&&(t=no(e,n),t===2&&(o=Da(e),o!==0&&(n=o,t=ui(e,o))),t===1))throw r=$n,sr(e,0),At(e,n),ze(e,ae()),r;switch(e.finishedWork=l,e.finishedLanes=n,t){case 0:case 1:throw Error(S(345));case 2:lr(e,Ie,xt);break;case 3:if(At(e,n),(n&130023424)===n&&(t=Zi+500-ae(),10<t)){if(Al(e,0)!==0)break;if(l=e.suspendedLanes,(l&n)!==n){Ne(),e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=Wa(lr.bind(null,e,Ie,xt),t);break}lr(e,Ie,xt);break;case 4:if(At(e,n),(n&4194240)===n)break;for(t=e.eventTimes,l=-1;0<n;){var a=31-ot(n);o=1<<a,a=t[a],a>l&&(l=a),n&=~o}if(n=l,n=ae()-n,n=(120>n?120:480>n?480:1080>n?1080:1920>n?1920:3e3>n?3e3:4320>n?4320:1960*Om(n/1960))-n,10<n){e.timeoutHandle=Wa(lr.bind(null,e,Ie,xt),n);break}lr(e,Ie,xt);break;case 5:lr(e,Ie,xt);break;default:throw Error(S(329))}}}return ze(e,ae()),e.callbackNode===r?Jd.bind(null,e):null}function ui(e,t){var r=Nn;return e.current.memoizedState.isDehydrated&&(sr(e,t).flags|=256),e=no(e,t),e!==2&&(t=Ie,Ie=r,t!==null&&ci(t)),e}function ci(e){Ie===null?Ie=e:Ie.push.apply(Ie,e)}function Bm(e){for(var t=e;;){if(t.flags&16384){var r=t.updateQueue;if(r!==null&&(r=r.stores,r!==null))for(var n=0;n<r.length;n++){var l=r[n],o=l.getSnapshot;l=l.value;try{if(!it(o(),l))return!1}catch{return!1}}}if(r=t.child,t.subtreeFlags&16384&&r!==null)r.return=t,t=r;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function At(e,t){for(t&=~Ji,t&=~ho,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var r=31-ot(t),n=1<<r;e[r]=-1,t&=~n}}function Au(e){if(W&6)throw Error(S(327));Hr();var t=Al(e,0);if(!(t&1))return ze(e,ae()),null;var r=no(e,t);if(e.tag!==0&&r===2){var n=Da(e);n!==0&&(t=n,r=ui(e,n))}if(r===1)throw r=$n,sr(e,0),At(e,t),ze(e,ae()),r;if(r===6)throw Error(S(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,lr(e,Ie,xt),ze(e,ae()),null}function qi(e,t){var r=W;W|=1;try{return e(t)}finally{W=r,W===0&&(Yr=ae()+500,fo&&er())}}function gr(e){jt!==null&&jt.tag===0&&!(W&6)&&Hr();var t=W;W|=1;var r=Ke.transition,n=G;try{if(Ke.transition=null,G=1,e)return e()}finally{G=n,Ke.transition=r,W=t,!(W&6)&&er()}}function es(){De=zr.current,K(zr)}function sr(e,t){e.finishedWork=null,e.finishedLanes=0;var r=e.timeoutHandle;if(r!==-1&&(e.timeoutHandle=-1,mm(r)),ue!==null)for(r=ue.return;r!==null;){var n=r;switch(Fi(n),n.tag){case 1:n=n.type.childContextTypes,n!=null&&$l();break;case 3:Vr(),K(Te),K(ke),Wi();break;case 5:Ui(n);break;case 4:Vr();break;case 13:K(q);break;case 19:K(q);break;case 10:Bi(n.type._context);break;case 22:case 23:es()}r=r.return}if(pe=e,ue=e=Qt(e.current,null),he=De=t,de=0,$n=null,Ji=ho=mr=0,Ie=Nn=null,ar!==null){for(t=0;t<ar.length;t++)if(r=ar[t],n=r.interleaved,n!==null){r.interleaved=null;var l=n.next,o=r.pending;if(o!==null){var a=o.next;o.next=l,n.next=a}r.pending=n}ar=null}return e}function Zd(e,t){do{var r=ue;try{if(Oi(),Il.current=ql,Zl){for(var n=ee.memoizedState;n!==null;){var l=n.queue;l!==null&&(l.pending=null),n=n.next}Zl=!1}if(pr=0,fe=ce=ee=null,En=!1,jn=0,Ki.current=null,r===null||r.return===null){de=1,$n=t,ue=null;break}e:{var o=e,a=r.return,i=r,s=t;if(t=he,i.flags|=32768,s!==null&&typeof s=="object"&&typeof s.then=="function"){var c=s,h=i,v=h.tag;if(!(h.mode&1)&&(v===0||v===11||v===15)){var g=h.alternate;g?(h.updateQueue=g.updateQueue,h.memoizedState=g.memoizedState,h.lanes=g.lanes):(h.updateQueue=null,h.memoizedState=null)}var w=bu(a);if(w!==null){w.flags&=-257,_u(w,a,i,o,t),w.mode&1&&Nu(o,c,t),t=w,s=c;var E=t.updateQueue;if(E===null){var x=new Set;x.add(s),t.updateQueue=x}else E.add(s);break e}else{if(!(t&1)){Nu(o,c,t),ts();break e}s=Error(S(426))}}else if(Z&&i.mode&1){var j=bu(a);if(j!==null){!(j.flags&65536)&&(j.flags|=256),_u(j,a,i,o,t),Di(Gr(s,i));break e}}o=s=Gr(s,i),de!==4&&(de=2),Nn===null?Nn=[o]:Nn.push(o),o=a;do{switch(o.tag){case 3:o.flags|=65536,t&=-t,o.lanes|=t;var f=Dd(o,s,t);xu(o,f);break e;case 1:i=s;var d=o.type,m=o.stateNode;if(!(o.flags&128)&&(typeof d.getDerivedStateFromError=="function"||m!==null&&typeof m.componentDidCatch=="function"&&(Yt===null||!Yt.has(m)))){o.flags|=65536,t&=-t,o.lanes|=t;var k=Md(o,i,t);xu(o,k);break e}}o=o.return}while(o!==null)}tf(r)}catch(y){t=y,ue===r&&r!==null&&(ue=r=r.return);continue}break}while(!0)}function qd(){var e=eo.current;return eo.current=ql,e===null?ql:e}function ts(){(de===0||de===3||de===2)&&(de=4),pe===null||!(mr&268435455)&&!(ho&268435455)||At(pe,he)}function no(e,t){var r=W;W|=2;var n=qd();(pe!==e||he!==t)&&(xt=null,sr(e,t));do try{Am();break}catch(l){Zd(e,l)}while(!0);if(Oi(),W=r,eo.current=n,ue!==null)throw Error(S(261));return pe=null,he=0,de}function Am(){for(;ue!==null;)ef(ue)}function Hm(){for(;ue!==null&&!dp();)ef(ue)}function ef(e){var t=nf(e.alternate,e,De);e.memoizedProps=e.pendingProps,t===null?tf(e):ue=t,Ki.current=null}function tf(e){var t=e;do{var r=t.alternate;if(e=t.return,t.flags&32768){if(r=zm(r,t),r!==null){r.flags&=32767,ue=r;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{de=6,ue=null;return}}else if(r=Pm(r,t,De),r!==null){ue=r;return}if(t=t.sibling,t!==null){ue=t;return}ue=t=e}while(t!==null);de===0&&(de=5)}function lr(e,t,r){var n=G,l=Ke.transition;try{Ke.transition=null,G=1,jm(e,t,r,n)}finally{Ke.transition=l,G=n}return null}function jm(e,t,r,n){do Hr();while(jt!==null);if(W&6)throw Error(S(327));r=e.finishedWork;var l=e.finishedLanes;if(r===null)return null;if(e.finishedWork=null,e.finishedLanes=0,r===e.current)throw Error(S(177));e.callbackNode=null,e.callbackPriority=0;var o=r.lanes|r.childLanes;if(kp(e,o),e===pe&&(ue=pe=null,he=0),!(r.subtreeFlags&2064)&&!(r.flags&2064)||kl||(kl=!0,lf(Bl,function(){return Hr(),null})),o=(r.flags&15990)!==0,r.subtreeFlags&15990||o){o=Ke.transition,Ke.transition=null;var a=G;G=1;var i=W;W|=4,Ki.current=null,Dm(e,r),Qd(r,e),im(ja),Hl=!!Ha,ja=Ha=null,e.current=r,Mm(r),fp(),W=i,G=a,Ke.transition=o}else e.current=r;if(kl&&(kl=!1,jt=e,ro=l),o=e.pendingLanes,o===0&&(Yt=null),gp(r.stateNode),ze(e,ae()),t!==null)for(n=e.onRecoverableError,r=0;r<t.length;r++)l=t[r],n(l.value,{componentStack:l.stack,digest:l.digest});if(to)throw to=!1,e=ii,ii=null,e;return ro&1&&e.tag!==0&&Hr(),o=e.pendingLanes,o&1?e===si?bn++:(bn=0,si=e):bn=0,er(),null}function Hr(){if(jt!==null){var e=Dc(ro),t=Ke.transition,r=G;try{if(Ke.transition=null,G=16>e?16:e,jt===null)var n=!1;else{if(e=jt,jt=null,ro=0,W&6)throw Error(S(331));var l=W;for(W|=4,L=e.current;L!==null;){var o=L,a=o.child;if(L.flags&16){var i=o.deletions;if(i!==null){for(var s=0;s<i.length;s++){var c=i[s];for(L=c;L!==null;){var h=L;switch(h.tag){case 0:case 11:case 15:Cn(8,h,o)}var v=h.child;if(v!==null)v.return=h,L=v;else for(;L!==null;){h=L;var g=h.sibling,w=h.return;if(Gd(h),h===c){L=null;break}if(g!==null){g.return=w,L=g;break}L=w}}}var E=o.alternate;if(E!==null){var x=E.child;if(x!==null){E.child=null;do{var j=x.sibling;x.sibling=null,x=j}while(x!==null)}}L=o}}if(o.subtreeFlags&2064&&a!==null)a.return=o,L=a;else e:for(;L!==null;){if(o=L,o.flags&2048)switch(o.tag){case 0:case 11:case 15:Cn(9,o,o.return)}var f=o.sibling;if(f!==null){f.return=o.return,L=f;break e}L=o.return}}var d=e.current;for(L=d;L!==null;){a=L;var m=a.child;if(a.subtreeFlags&2064&&m!==null)m.return=a,L=m;else e:for(a=d;L!==null;){if(i=L,i.flags&2048)try{switch(i.tag){case 0:case 11:case 15:go(9,i)}}catch(y){ne(i,i.return,y)}if(i===a){L=null;break e}var k=i.sibling;if(k!==null){k.return=i.return,L=k;break e}L=i.return}}if(W=l,er(),ft&&typeof ft.onPostCommitFiberRoot=="function")try{ft.onPostCommitFiberRoot(ao,e)}catch{}n=!0}return n}finally{G=r,Ke.transition=t}}return!1}function Hu(e,t,r){t=Gr(r,t),t=Dd(e,t,1),e=Gt(e,t,1),t=Ne(),e!==null&&(Gn(e,1,t),ze(e,t))}function ne(e,t,r){if(e.tag===3)Hu(e,e,r);else for(;t!==null;){if(t.tag===3){Hu(t,e,r);break}else if(t.tag===1){var n=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof n.componentDidCatch=="function"&&(Yt===null||!Yt.has(n))){e=Gr(r,e),e=Md(t,e,1),t=Gt(t,e,1),e=Ne(),t!==null&&(Gn(t,1,e),ze(t,e));break}}t=t.return}}function Um(e,t,r){var n=e.pingCache;n!==null&&n.delete(t),t=Ne(),e.pingedLanes|=e.suspendedLanes&r,pe===e&&(he&r)===r&&(de===4||de===3&&(he&130023424)===he&&500>ae()-Zi?sr(e,0):Ji|=r),ze(e,t)}function rf(e,t){t===0&&(e.mode&1?(t=dl,dl<<=1,!(dl&130023424)&&(dl=4194304)):t=1);var r=Ne();e=bt(e,t),e!==null&&(Gn(e,t,r),ze(e,r))}function Wm(e){var t=e.memoizedState,r=0;t!==null&&(r=t.retryLane),rf(e,r)}function $m(e,t){var r=0;switch(e.tag){case 13:var n=e.stateNode,l=e.memoizedState;l!==null&&(r=l.retryLane);break;case 19:n=e.stateNode;break;default:throw Error(S(314))}n!==null&&n.delete(t),rf(e,r)}var nf;nf=function(e,t,r){if(e!==null)if(e.memoizedProps!==t.pendingProps||Te.current)Re=!0;else{if(!(e.lanes&r)&&!(t.flags&128))return Re=!1,Tm(e,t,r);Re=!!(e.flags&131072)}else Re=!1,Z&&t.flags&1048576&&id(t,Yl,t.index);switch(t.lanes=0,t.tag){case 2:var n=t.type;Tl(e,t),e=t.pendingProps;var l=Ur(t,ke.current);Ar(t,r),l=Vi(null,t,n,e,l,r);var o=Gi();return t.flags|=1,typeof l=="object"&&l!==null&&typeof l.render=="function"&&l.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Pe(n)?(o=!0,Vl(t)):o=!1,t.memoizedState=l.state!==null&&l.state!==void 0?l.state:null,Hi(t),l.updater=mo,t.stateNode=l,l._reactInternals=t,Ka(t,n,e,r),t=qa(null,t,n,!0,o,r)):(t.tag=0,Z&&o&&zi(t),Ce(null,t,l,r),t=t.child),t;case 16:n=t.elementType;e:{switch(Tl(e,t),e=t.pendingProps,l=n._init,n=l(n._payload),t.type=n,l=t.tag=Gm(n),e=rt(n,e),l){case 0:t=Za(null,t,n,e,r);break e;case 1:t=Ru(null,t,n,e,r);break e;case 11:t=Lu(null,t,n,e,r);break e;case 14:t=Iu(null,t,n,rt(n.type,e),r);break e}throw Error(S(306,n,""))}return t;case 0:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:rt(n,l),Za(e,t,n,l,r);case 1:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:rt(n,l),Ru(e,t,n,l,r);case 3:e:{if(Hd(t),e===null)throw Error(S(387));n=t.pendingProps,o=t.memoizedState,l=o.element,pd(e,t),Kl(t,n,null,r);var a=t.memoizedState;if(n=a.element,o.isDehydrated)if(o={element:n,isDehydrated:!1,cache:a.cache,pendingSuspenseBoundaries:a.pendingSuspenseBoundaries,transitions:a.transitions},t.updateQueue.baseState=o,t.memoizedState=o,t.flags&256){l=Gr(Error(S(423)),t),t=Tu(e,t,n,r,l);break e}else if(n!==l){l=Gr(Error(S(424)),t),t=Tu(e,t,n,r,l);break e}else for(Oe=Vt(t.stateNode.containerInfo.firstChild),Be=t,Z=!0,lt=null,r=dd(t,null,n,r),t.child=r;r;)r.flags=r.flags&-3|4096,r=r.sibling;else{if(Wr(),n===l){t=_t(e,t,r);break e}Ce(e,t,n,r)}t=t.child}return t;case 5:return md(t),e===null&&Ya(t),n=t.type,l=t.pendingProps,o=e!==null?e.memoizedProps:null,a=l.children,Ua(n,l)?a=null:o!==null&&Ua(n,o)&&(t.flags|=32),Ad(e,t),Ce(e,t,a,r),t.child;case 6:return e===null&&Ya(t),null;case 13:return jd(e,t,r);case 4:return ji(t,t.stateNode.containerInfo),n=t.pendingProps,e===null?t.child=$r(t,null,n,r):Ce(e,t,n,r),t.child;case 11:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:rt(n,l),Lu(e,t,n,l,r);case 7:return Ce(e,t,t.pendingProps,r),t.child;case 8:return Ce(e,t,t.pendingProps.children,r),t.child;case 12:return Ce(e,t,t.pendingProps.children,r),t.child;case 10:e:{if(n=t.type._context,l=t.pendingProps,o=t.memoizedProps,a=l.value,Y(Xl,n._currentValue),n._currentValue=a,o!==null)if(it(o.value,a)){if(o.children===l.children&&!Te.current){t=_t(e,t,r);break e}}else for(o=t.child,o!==null&&(o.return=t);o!==null;){var i=o.dependencies;if(i!==null){a=o.child;for(var s=i.firstContext;s!==null;){if(s.context===n){if(o.tag===1){s=Et(-1,r&-r),s.tag=2;var c=o.updateQueue;if(c!==null){c=c.shared;var h=c.pending;h===null?s.next=s:(s.next=h.next,h.next=s),c.pending=s}}o.lanes|=r,s=o.alternate,s!==null&&(s.lanes|=r),Xa(o.return,r,t),i.lanes|=r;break}s=s.next}}else if(o.tag===10)a=o.type===t.type?null:o.child;else if(o.tag===18){if(a=o.return,a===null)throw Error(S(341));a.lanes|=r,i=a.alternate,i!==null&&(i.lanes|=r),Xa(a,r,t),a=o.sibling}else a=o.child;if(a!==null)a.return=o;else for(a=o;a!==null;){if(a===t){a=null;break}if(o=a.sibling,o!==null){o.return=a.return,a=o;break}a=a.return}o=a}Ce(e,t,l.children,r),t=t.child}return t;case 9:return l=t.type,n=t.pendingProps.children,Ar(t,r),l=Je(l),n=n(l),t.flags|=1,Ce(e,t,n,r),t.child;case 14:return n=t.type,l=rt(n,t.pendingProps),l=rt(n.type,l),Iu(e,t,n,l,r);case 15:return Od(e,t,t.type,t.pendingProps,r);case 17:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:rt(n,l),Tl(e,t),t.tag=1,Pe(n)?(e=!0,Vl(t)):e=!1,Ar(t,r),Fd(t,n,l),Ka(t,n,l,r),qa(null,t,n,!0,e,r);case 19:return Ud(e,t,r);case 22:return Bd(e,t,r)}throw Error(S(156,t.tag))};function lf(e,t){return Tc(e,t)}function Vm(e,t,r,n){this.tag=e,this.key=r,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=n,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Qe(e,t,r,n){return new Vm(e,t,r,n)}function rs(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Gm(e){if(typeof e=="function")return rs(e)?1:0;if(e!=null){if(e=e.$$typeof,e===ki)return 11;if(e===Si)return 14}return 2}function Qt(e,t){var r=e.alternate;return r===null?(r=Qe(e.tag,t,e.key,e.mode),r.elementType=e.elementType,r.type=e.type,r.stateNode=e.stateNode,r.alternate=e,e.alternate=r):(r.pendingProps=t,r.type=e.type,r.flags=0,r.subtreeFlags=0,r.deletions=null),r.flags=e.flags&14680064,r.childLanes=e.childLanes,r.lanes=e.lanes,r.child=e.child,r.memoizedProps=e.memoizedProps,r.memoizedState=e.memoizedState,r.updateQueue=e.updateQueue,t=e.dependencies,r.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},r.sibling=e.sibling,r.index=e.index,r.ref=e.ref,r}function Fl(e,t,r,n,l,o){var a=2;if(n=e,typeof e=="function")rs(e)&&(a=1);else if(typeof e=="string")a=5;else e:switch(e){case Er:return ur(r.children,l,o,t);case wi:a=8,l|=8;break;case wa:return e=Qe(12,r,t,l|2),e.elementType=wa,e.lanes=o,e;case ka:return e=Qe(13,r,t,l),e.elementType=ka,e.lanes=o,e;case Sa:return e=Qe(19,r,t,l),e.elementType=Sa,e.lanes=o,e;case mc:return vo(r,l,o,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case fc:a=10;break e;case pc:a=9;break e;case ki:a=11;break e;case Si:a=14;break e;case Dt:a=16,n=null;break e}throw Error(S(130,e==null?e:typeof e,""))}return t=Qe(a,r,t,l),t.elementType=e,t.type=n,t.lanes=o,t}function ur(e,t,r,n){return e=Qe(7,e,n,t),e.lanes=r,e}function vo(e,t,r,n){return e=Qe(22,e,n,t),e.elementType=mc,e.lanes=r,e.stateNode={isHidden:!1},e}function ga(e,t,r){return e=Qe(6,e,null,t),e.lanes=r,e}function ha(e,t,r){return t=Qe(4,e.children!==null?e.children:[],e.key,t),t.lanes=r,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Ym(e,t,r,n,l){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Ko(0),this.expirationTimes=Ko(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ko(0),this.identifierPrefix=n,this.onRecoverableError=l,this.mutableSourceEagerHydrationData=null}function ns(e,t,r,n,l,o,a,i,s){return e=new Ym(e,t,r,i,s),t===1?(t=1,o===!0&&(t|=8)):t=0,o=Qe(3,null,null,t),e.current=o,o.stateNode=e,o.memoizedState={element:n,isDehydrated:r,cache:null,transitions:null,pendingSuspenseBoundaries:null},Hi(o),e}function Xm(e,t,r){var n=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Sr,key:n==null?null:""+n,children:e,containerInfo:t,implementation:r}}function of(e){if(!e)return Jt;e=e._reactInternals;e:{if(vr(e)!==e||e.tag!==1)throw Error(S(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Pe(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(S(171))}if(e.tag===1){var r=e.type;if(Pe(r))return od(e,r,t)}return t}function af(e,t,r,n,l,o,a,i,s){return e=ns(r,n,!0,e,l,o,a,i,s),e.context=of(null),r=e.current,n=Ne(),l=Xt(r),o=Et(n,l),o.callback=t??null,Gt(r,o,l),e.current.lanes=l,Gn(e,l,n),ze(e,n),e}function yo(e,t,r,n){var l=t.current,o=Ne(),a=Xt(l);return r=of(r),t.context===null?t.context=r:t.pendingContext=r,t=Et(o,a),t.payload={element:e},n=n===void 0?null:n,n!==null&&(t.callback=n),e=Gt(l,t,a),e!==null&&(at(e,l,a,o),Ll(e,l,a)),a}function lo(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function ju(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var r=e.retryLane;e.retryLane=r!==0&&r<t?r:t}}function ls(e,t){ju(e,t),(e=e.alternate)&&ju(e,t)}function Qm(){return null}var sf=typeof reportError=="function"?reportError:function(e){console.error(e)};function os(e){this._internalRoot=e}xo.prototype.render=os.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(S(409));yo(e,t,null,null)};xo.prototype.unmount=os.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;gr(function(){yo(null,e,null,null)}),t[Nt]=null}};function xo(e){this._internalRoot=e}xo.prototype.unstable_scheduleHydration=function(e){if(e){var t=Bc();e={blockedOn:null,target:e,priority:t};for(var r=0;r<Bt.length&&t!==0&&t<Bt[r].priority;r++);Bt.splice(r,0,e),r===0&&Hc(e)}};function as(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function wo(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function Uu(){}function Km(e,t,r,n,l){if(l){if(typeof n=="function"){var o=n;n=function(){var c=lo(a);o.call(c)}}var a=af(t,n,e,0,null,!1,!1,"",Uu);return e._reactRootContainer=a,e[Nt]=a.current,Mn(e.nodeType===8?e.parentNode:e),gr(),a}for(;l=e.lastChild;)e.removeChild(l);if(typeof n=="function"){var i=n;n=function(){var c=lo(s);i.call(c)}}var s=ns(e,0,!1,null,null,!1,!1,"",Uu);return e._reactRootContainer=s,e[Nt]=s.current,Mn(e.nodeType===8?e.parentNode:e),gr(function(){yo(t,s,r,n)}),s}function ko(e,t,r,n,l){var o=r._reactRootContainer;if(o){var a=o;if(typeof l=="function"){var i=l;l=function(){var s=lo(a);i.call(s)}}yo(t,a,e,l)}else a=Km(r,t,e,l,n);return lo(a)}Mc=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var r=gn(t.pendingLanes);r!==0&&(Ni(t,r|1),ze(t,ae()),!(W&6)&&(Yr=ae()+500,er()))}break;case 13:gr(function(){var n=bt(e,1);if(n!==null){var l=Ne();at(n,e,1,l)}}),ls(e,1)}};bi=function(e){if(e.tag===13){var t=bt(e,134217728);if(t!==null){var r=Ne();at(t,e,134217728,r)}ls(e,134217728)}};Oc=function(e){if(e.tag===13){var t=Xt(e),r=bt(e,t);if(r!==null){var n=Ne();at(r,e,t,n)}ls(e,t)}};Bc=function(){return G};Ac=function(e,t){var r=G;try{return G=e,t()}finally{G=r}};Pa=function(e,t,r){switch(t){case"input":if(Na(e,r),t=r.name,r.type==="radio"&&t!=null){for(r=e;r.parentNode;)r=r.parentNode;for(r=r.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<r.length;t++){var n=r[t];if(n!==e&&n.form===e.form){var l=co(n);if(!l)throw Error(S(90));hc(n),Na(n,l)}}}break;case"textarea":yc(e,r);break;case"select":t=r.value,t!=null&&Dr(e,!!r.multiple,t,!1)}};Nc=qi;bc=gr;var Jm={usingClientEntryPoint:!1,Events:[Xn,_r,co,Ec,Cc,qi]},cn={findFiberByHostInstance:or,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Zm={bundleType:cn.bundleType,version:cn.version,rendererPackageName:cn.rendererPackageName,rendererConfig:cn.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Lt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=Ic(e),e===null?null:e.stateNode},findFiberByHostInstance:cn.findFiberByHostInstance||Qm,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Sl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Sl.isDisabled&&Sl.supportsFiber)try{ao=Sl.inject(Zm),ft=Sl}catch{}}He.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Jm;He.createPortal=function(e,t){var r=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!as(t))throw Error(S(200));return Xm(e,t,null,r)};He.createRoot=function(e,t){if(!as(e))throw Error(S(299));var r=!1,n="",l=sf;return t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(n=t.identifierPrefix),t.onRecoverableError!==void 0&&(l=t.onRecoverableError)),t=ns(e,1,!1,null,null,r,!1,n,l),e[Nt]=t.current,Mn(e.nodeType===8?e.parentNode:e),new os(t)};He.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(S(188)):(e=Object.keys(e).join(","),Error(S(268,e)));return e=Ic(t),e=e===null?null:e.stateNode,e};He.flushSync=function(e){return gr(e)};He.hydrate=function(e,t,r){if(!wo(t))throw Error(S(200));return ko(null,e,t,!0,r)};He.hydrateRoot=function(e,t,r){if(!as(e))throw Error(S(405));var n=r!=null&&r.hydratedSources||null,l=!1,o="",a=sf;if(r!=null&&(r.unstable_strictMode===!0&&(l=!0),r.identifierPrefix!==void 0&&(o=r.identifierPrefix),r.onRecoverableError!==void 0&&(a=r.onRecoverableError)),t=af(t,null,e,1,r??null,l,!1,o,a),e[Nt]=t.current,Mn(e),n)for(e=0;e<n.length;e++)r=n[e],l=r._getVersion,l=l(r._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[r,l]:t.mutableSourceEagerHydrationData.push(r,l);return new xo(t)};He.render=function(e,t,r){if(!wo(t))throw Error(S(200));return ko(null,e,t,!1,r)};He.unmountComponentAtNode=function(e){if(!wo(e))throw Error(S(40));return e._reactRootContainer?(gr(function(){ko(null,null,e,!1,function(){e._reactRootContainer=null,e[Nt]=null})}),!0):!1};He.unstable_batchedUpdates=qi;He.unstable_renderSubtreeIntoContainer=function(e,t,r,n){if(!wo(r))throw Error(S(200));if(e==null||e._reactInternals===void 0)throw Error(S(38));return ko(e,t,r,!1,n)};He.version="18.3.1-next-f1338f8080-20240426";function uf(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(uf)}catch(e){console.error(e)}}uf(),sc.exports=He;var qm=sc.exports,Wu=qm;ya.createRoot=Wu.createRoot,ya.hydrateRoot=Wu.hydrateRoot;const le=[7,6,7,6,7,6,7];function Me(e){return`L${e.layer}-R${e.row}-C${e.col}`}function e0(e,t){if(e.layer<1||e.layer>t||e.row<0||e.row>=le.length)return!1;const r=le[e.row];return!(e.col<0||e.col>=r)}function kr(e,t,r){if(!e0(e,t))throw new Error(`${r} out of bounds: L${e.layer} R${e.row} C${e.col}. Valid rows: 0..${le.length-1}, layers: 1..${t}.`)}function t0(e){kr(e.start,e.layers,"scenario.start"),kr(e.goal,e.layers,"scenario.goal");for(const i of e.missing)kr(i,e.layers,"scenario.missing");for(const i of e.blocked)kr(i,e.layers,"scenario.blocked");for(const i of e.transitions)kr(i.from,e.layers,"scenario.transitions.from"),kr(i.to,e.layers,"scenario.transitions.to");const t=new Set(e.missing.map(Me)),r=new Set(e.blocked.map(Me)),n=new Map,l=new Map;for(let i=1;i<=e.layers;i++){const s=[];for(let c=0;c<le.length;c++){const h=le[c],v=[];for(let g=0;g<h;g++){const w=Me({layer:i,row:c,col:g}),E=t.has(w),x=r.has(w),j=w===Me(e.goal),f={id:w,pos:{layer:i,row:c,col:g},kind:j?"GOAL":"NORMAL",missing:E,blocked:x,revealed:!1};n.set(w,f),v.push(w)}s.push(v)}l.set(i,s)}const o=new Map;for(const i of e.transitions)o.set(Me(i.from),i);const a={scenario:e,turn:0,visibleLayers:new Set,playerHexId:Me(e.start),hexesById:n,rows:l,transitionsByFromId:o};return Ot(a,e.start.layer),cr(a,a.playerHexId),a}function cr(e,t){const r=e.hexesById.get(t);r&&(r.revealed=!0)}function Ot(e,t){const r=e.visibleLayers.has(t);if(e.visibleLayers.add(t),r||!e.scenario.revealOnEnterGuaranteedUp)return null;const n=e.rows.get(t);if(!n)return null;for(const l of n)for(const o of l){const a=e.hexesById.get(o);if(!a||a.missing||a.blocked)continue;const i=e.transitionsByFromId.get(o);if((i==null?void 0:i.type)==="UP")return cr(e,o),e.lastGuaranteedUpId=o,e.lastGuaranteedUpTurn=e.turn,o}return null}const oo=7;function r0(e,t=oo){if(e.layer<1||e.layer>t||e.row<0||e.row>=le.length)return!1;const r=le[e.row];return e.col>=0&&e.col<r}function Fr(e,t,r=oo){if(!r0(e,r))throw new Error(`${t} out of bounds: ${JSON.stringify(e)}`)}function n0(e){if(!e||typeof e!="object")throw new Error("Scenario is missing/invalid");if(!e.id||!e.name)throw new Error("Scenario needs id and name");if(e.layers!==oo)throw new Error(`v0.1 expects layers=${oo}`);if(!e.start||!e.goal)throw new Error("Scenario missing start/goal");e.missing=e.missing??[],e.blocked=e.blocked??[],e.transitions=e.transitions??[],e.movement=e.movement??{},typeof e.revealOnEnterGuaranteedUp!="boolean"&&(e.revealOnEnterGuaranteedUp=!0),Fr(e.start,"start",e.layers),Fr(e.goal,"goal",e.layers);for(const s of e.missing)Fr(s,"missing",e.layers);for(const s of e.blocked)Fr(s,"blocked",e.layers);const t=new Set(e.missing.map(Me)),r=new Set(e.blocked.map(Me)),n=Me(e.start),l=Me(e.goal);if(t.has(n)||r.has(n))throw new Error("Start cannot be missing/blocked");if(t.has(l)||r.has(l))throw new Error("Goal cannot be missing/blocked");const o=new Set,a=new Map;for(const s of e.transitions){l0(s,e.layers);const c=Me(s.from);if(o.has(c))throw new Error(`Multiple transitions from same hex: ${c}`);if(o.add(c),t.has(c)||r.has(c))throw new Error(`Transition FROM missing/blocked: ${c}`);const h=Me(s.to);if(t.has(h)||r.has(h))throw new Error(`Transition TO missing/blocked: ${h}`);s.type==="UP"&&a.set(s.from.layer,(a.get(s.from.layer)??0)+1)}const i=new Set(["NONE","SEVEN_LEFT_SIX_RIGHT","TOP3_RIGHT_BOTTOM4_LEFT"]);for(const[s,c]of Object.entries(e.movement)){const h=Number(s);if(!Number.isFinite(h)||h<1||h>e.layers)throw new Error(`Invalid movement layer key: ${s}`);if(!i.has(c))throw new Error(`Invalid movement pattern on layer ${h}: ${String(c)}`)}if(e.movement[1]&&e.movement[1]!=="NONE")throw new Error("v0.1: Layer 1 must be NONE/static");if(e.revealOnEnterGuaranteedUp){for(let s=1;s<=e.layers;s++)if((a.get(s)??0)===0)throw new Error(`revealOnEnterGuaranteedUp is true, but Layer ${s} has no usable UP transitions.`)}}function l0(e,t){if(!e)throw new Error("Transition missing");if(e.type!=="UP"&&e.type!=="DOWN")throw new Error(`Invalid transition type: ${String(e.type)}`);if(!e.from||!e.to)throw new Error("Transition missing from/to");Fr(e.from,"Transition FROM",t),Fr(e.to,"Transition TO",t)}function di(e,t,r){const n=e.rows.get(t);if(!n)return null;for(let l=0;l<n.length;l++){const o=n[l].indexOf(r);if(o>=0)return{row:l,col:o}}return null}function cf(e,t,r,n){const l=e.rows.get(t);if(!l)return null;const o=l[r];return!o||n<0||n>=o.length?null:o[n]}function o0(e,t){const r=[],n=le[e]??7;t-1>=0&&r.push({r:e,c:t-1}),t+1<n&&r.push({r:e,c:t+1});const l=e-1,o=e+1,a=l>=0?le[l]??7:0,i=o<le.length?le[o]??7:0,s=n===6,c=s?t:t-1,h=s?t+1:t,v=s?t:t-1,g=s?t+1:t;return l>=0&&(c>=0&&c<a&&r.push({r:l,c}),h>=0&&h<a&&r.push({r:l,c:h})),o<le.length&&(v>=0&&v<i&&r.push({r:o,c:v}),g>=0&&g<i&&r.push({r:o,c:g})),r}function a0(e,t,r){const n=le[r]??7,l=e.rows.get(t);if(!l)return 0;const o=l[r];if(!(o!=null&&o.length))return 0;const a=`L${t}-R${r}-C0`,i=o.indexOf(a);return i<0?0:i>n/2?i-n:i}function i0(e,t,r){const n=a0(e,t,r);return n===0?"":n<0?`L${Math.abs(n)}`:`R${n}`}function $u(e,t,r){if(!t||!r)return"down";const n=e.hexesById.get(t),l=e.hexesById.get(r);if(!n||!l||n.pos.layer!==l.pos.layer)return"down";const o=n.pos.layer,a=di(e,o,t),i=di(e,o,r);if(!a||!i)return"down";const s=le[a.row]??7;let c=i.col-a.col;a.row===i.row&&(c=(c+s/2)%s-s/2);const h=i.row-a.row;return Math.abs(c)>=Math.abs(h)*.5?c>0?"right":c<0?"left":"down":h>0?"down":"up"}function _n(e,t){const r=e.hexesById.get(t);if(!r)return[];const n=r.pos.layer,l=di(e,n,t);if(!l)return[];const o=o0(l.row,l.col),a=[];for(const i of o){const s=cf(e,n,i.r,i.c);s&&a.push(s)}return a}function df(e,t){const r=e.hexesById.get(e.playerHexId);if(!r)return{ok:!1,state:e,reason:"INVALID"};const n=e.hexesById.get(t);if(!n)return{ok:!1,state:e,reason:"INVALID"};if(r.pos.layer!==n.pos.layer)return{ok:!1,state:e,reason:"INVALID"};if(!new Set(_n(e,e.playerHexId)).has(t))return{ok:!1,state:e,reason:"INVALID"};if(n.blocked||n.missing)return Vu(e),{ok:!1,state:e,reason:"BLOCKED"};e.playerHexId=t,cr(e,t);let o=!1;const a=e.transitionsByFromId.get(t);if(a){const c=Me(a.to),h=e.hexesById.get(c);h&&!h.blocked&&!h.missing&&(o=!0,e.playerHexId=c,Ot(e,a.to.layer),cr(e,c))}const i=e.hexesById.get(e.playerHexId),s=!!i&&i.kind==="GOAL";return Vu(e),{ok:!0,state:e,triggeredTransition:o,won:s}}function Vu(e){var n;e.turn+=1;const t=e.scenario.movement??{},r=Number((n=e.scenario)==null?void 0:n.layers)||(e.rows&&typeof e.rows.size=="number"?e.rows.size:1);for(let l=1;l<=r;l++){const o=s0(t,l);u0(e,l,o)}}function s0(e,t){return e[String(t)]??"NONE"}function u0(e,t,r){if(r==="NONE")return;const n=e.rows.get(t);if(n)for(let l=0;l<n.length;l++){const o=n[l];if(o.length<=1)continue;let a="L";if(r==="SEVEN_LEFT_SIX_RIGHT"?a=o.length===7?"L":"R":r==="TOP3_RIGHT_BOTTOM4_LEFT"&&(a=l<=2?"R":"L"),a==="L"){const i=o.shift();i!=null&&o.push(i)}else{const i=o.pop();i!=null&&o.unshift(i)}}}function Gu(e){return{turn:e.turn,visibleLayers:Array.from(e.visibleLayers),playerHexId:e.playerHexId,rows:Array.from(e.rows.entries()).map(([t,r])=>({layer:t,rows:r.map(n=>[...n])})),lastGuaranteedUpId:e.lastGuaranteedUpId,lastGuaranteedUpTurn:e.lastGuaranteedUpTurn}}function Yu(e,t){const r=e.hexesById,n=e.transitionsByFromId,l=e.scenario,o=new Map;for(const a of t.rows)o.set(a.layer,a.rows.map(i=>[...i]));return{scenario:l,turn:t.turn,visibleLayers:new Set(t.visibleLayers),playerHexId:t.playerHexId,hexesById:r,rows:o,transitionsByFromId:n,lastGuaranteedUpId:t.lastGuaranteedUpId,lastGuaranteedUpTurn:t.lastGuaranteedUpTurn}}function c0(e){for(const r of e.hexesById.values())if(r.kind==="GOAL")return r.id;const t=e.scenario.goal;return t?`L${t.layer}-R${t.row}-C${t.col}`:null}function Xu(e){let t="";const r=e.rows.slice().sort((n,l)=>n.layer-l.layer);for(const n of r){t+=`|L${n.layer}`;for(let l=0;l<n.rows.length;l++)t+=`|${n.rows[l].join(",")}`}return`p=${e.playerHexId}|t=${e.turn}${t}`}function d0(e,t=80){const r=c0(e);if(!r)return null;const n=e.hexesById.get(e.playerHexId);if(!n||n.missing||n.blocked)return null;if(e.playerHexId===r)return 0;const l=Gu(e),o=[{dto:l,turns:0}];let a=0;const i=new Set([Xu(l)]);let s=0;const c=4e5;for(;a<o.length;){if(s>=c)return null;const h=o[a++];if(s++,h.turns>=t)continue;const v=Yu(e,h.dto),g=_n(v,v.playerHexId);for(const w of g){const E=v.hexesById.get(w);if(!E||E.missing||E.blocked)continue;const x=Yu(e,h.dto);if(!df(x,w).ok)continue;const f=h.turns+1;if(x.playerHexId===r)return f;const d=Gu(x),m=Xu(d);i.has(m)||(i.add(m),o.push({dto:d,turns:f}))}}return null}function f0(e){return t0(e)}function p0(e,t){return d0(e,t)}function Qu(e,t){return df(e,t)}const m0={id:"rainbow_realm",name:"Rainbow Realm",desc:"Bright, magical rainbow world",menu:{solidColor:"#1e66ff"},scenarios:[{id:"prism_path",name:"Prism Path",desc:"First rainbow scenario",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario.json",theme:{palette:{L1:"#FF4D7D",L2:"#FF9A3D",L3:"#FFD35A",L4:"#4BEE9C",L5:"#3ED7FF",L6:"#5C7CFF",L7:"#B66BFF"},assets:{backgroundGame:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",diceFacesBase:"worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",diceCornerBorder:"worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",villainsBase:"worlds/rainbow_realm/scenarios/prism_path/assets/villains",backgroundLayers:{L1:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L2:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L3:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L4:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L5:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L6:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L7:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png"}}},tracks:[{id:"t1",name:"Track 1",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario.json"},{id:"t2",name:"Track 2",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario2.json"},{id:"t3",name:"Track 3",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario3.json"},{id:"t4",name:"Track 4",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario4.json"},{id:"t5",name:"Track 5",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario4.json"},{id:"t6",name:"Track 6",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario5.json"},{id:"t7",name:"Track 7",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario6.json"},{id:"t8",name:"Track 8",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario7.json"},{id:"t9",name:"Track 9",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario8.json"},{id:"t10",name:"Track 10",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario9.json"},{id:"t11",name:"Track 11",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario10.json"},{id:"t12",name:"Track 12",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario11.json"},{id:"t13",name:"Brain Melter I",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario12.json"},{id:"t14",name:"Brain Melter II",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario13.json"},{id:"t15",name:"Brain Melter III",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario14.json"},{id:"t16",name:"Brain Melter IV",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario15.json"},{id:"t17",name:"Brain Melter V",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario16.json"},{id:"t18",name:"Brain Melter VI",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario17.json"},{id:"t19",name:"Brain Melter VII",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario18.json"},{id:"t20",name:"Brain Melter VIII",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario19.json"},{id:"t21",name:"Brain Melter IX",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario20.json"},{id:"t22",name:"Brain Melter X",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario21.json"}]}]},Ku=[m0],g0=Object.freeze(Object.defineProperty({__proto__:null,default:Ku,worlds:Ku},Symbol.toStringTag,{value:"Module"})),h0="tiles/demo",v0={normal:"NORMAL.png",blocked:"BLOCKED.png",fog:"FOG.png",goal:"GOAL.png",hole:"HOLE.png",stairsUp:"STAIRS_UP.png",stairsDown:"STAIRS_DOWN.png",start:"START.png"};function y0(e){return e.revealed?e.blocked?"blocked":e.isGoal?"goal":e.isStart?"start":e.isPortalUp?"stairsUp":e.isPortalDown?"stairsDown":"normal":"fog"}function x0(e){return`${h0}/${v0[e]}`}function w0(){const e=g0;return Array.isArray(e==null?void 0:e.worlds)&&e.worlds||Array.isArray(e==null?void 0:e.default)&&e.default||Array.isArray(e==null?void 0:e.registeredWorlds)&&e.registeredWorlds||Array.isArray(e==null?void 0:e.registry)&&e.registry||[]}function k0(e){if(!e)return null;const t=e.default??e,r=String(t.id??t.slug??t.key??"world"),n=String(t.name??t.title??r),o=(Array.isArray(t.scenarios)?t.scenarios:[]).map((a,i)=>{if(!a)return null;const s=String(a.id??a.slug??`scenario-${i}`),c=String(a.name??a.title??s),h=String(a.scenarioJson??a.json??"");if(!h)return null;const v=a.theme??{palette:{L1:"#19ffb4",L2:"#67a5ff",L3:"#ffd36a",L4:"#ff7ad1",L5:"#a1ff5a",L6:"#a58bff",L7:"#ff5d7a"},assets:{diceFacesBase:"images/dice",diceCornerBorder:"",villainsBase:"images/villains"}},g=Array.isArray(a.tracks)?a.tracks.map((w,E)=>{if(!w)return null;const x=String(w.id??`track-${E}`),j=String(w.name??x),f=String(w.scenarioJson??w.json??"");return f?{id:x,name:j,scenarioJson:f}:null}).filter(Boolean):void 0;return{id:s,name:c,desc:a.desc,scenarioJson:h,theme:v,tracks:g&&g.length?g:void 0}}).filter(Boolean);return o.length===0?null:{id:r,name:n,desc:t.desc,menu:t.menu??{},scenarios:o}}function S0(){const e=w0(),t=[];for(const r of e){const n=k0(r);n&&t.push(n)}return t.sort((r,n)=>r.name.localeCompare(n.name)),t}const fi={current:null};function dn(e){return e&&!e.scenario&&fi.current&&(e.scenario=fi.current),e}function tt(e){const t=/^L(\d+)-R(\d+)-C(\d+)$/.exec(e);return t?{layer:Number(t[1]),row:Number(t[2]),col:Number(t[3])}:null}function ut(e){const t="/TestGame/",r=String(t).endsWith("/")?String(t):`${t}/`,n=String(e).replace(/^\/+/,"");return r+n}async function E0(e){const t=await fetch(ut(e));if(!t.ok)throw new Error(`Failed to load: ${e}`);return t.json()}async function C0(e){const r=e+(e.includes("?")?"&":"?")+"v="+encodeURIComponent("20260801e"),n=await E0(r);return n0(n),n}function vn(e,t){var n;if(!e)return;const r=e.hexesById;return r!=null&&r.get?r.get(t):(n=e.hexesById)==null?void 0:n[t]}function Ju(e){return e?{missing:!!e.missing,blocked:!!e.blocked}:{blocked:!0,missing:!0}}function fn(e){return`var(--L${Math.max(1,Math.min(7,Math.floor(e||1)))})`}function N0(){const e=new Date,t=String(e.getHours()).padStart(2,"0"),r=String(e.getMinutes()).padStart(2,"0");return`${t}:${r}`}function b0(e,t){const r=(e==null?void 0:e.goalHexId)??(e==null?void 0:e.goalId)??(e==null?void 0:e.exitHexId)??(e==null?void 0:e.exitId)??(e==null?void 0:e.targetHexId)??(e==null?void 0:e.targetId)??(e==null?void 0:e.winHexId)??(e==null?void 0:e.winId)??null;if(typeof r=="string"&&/^L\d+-R\d+-C\d+$/.test(r))return r;const n=(e==null?void 0:e.goal)??(e==null?void 0:e.exit)??(e==null?void 0:e.target)??null;if(n&&typeof n=="object"){const l=Number(n.layer??t),o=Number(n.row??n.r),a=Number(n.col??n.c);if(Number.isFinite(l)&&Number.isFinite(o)&&Number.isFinite(a))return`L${l}-R${o}-C${a}`}return null}function _0(e,t){for(let r=0;r<le.length;r++){const n=le[r];for(let l=0;l<n;l++){const o="L"+t+"-R"+r+"-C"+l,a=vn(e,o);if(a&&!a.blocked&&!a.missing)return o}}return null}function Zu(e,t){return{gridColumn:((le[e]??7)===6?t*2+2:t*2+1)+" / span 2",gridRow:e+1}}function L0(e){const t=Array.isArray(e==null?void 0:e.cardTriggers)&&e.cardTriggers||[],r=["cosmic","risk","terrain","shadow"],n=a=>a>=1&&a<=7?a-1:a,l=a=>a>=1&&a<=7?a-1:a,o=[];for(const a of t){if(!a||typeof a!="object")continue;const i=String(a.card??a.key??a.id??"cosmic"),s=r.includes(i)?i:"cosmic",c=Number(a.layer??1);let h=n(Number(a.row??0)),v=l(Number(a.col??0));!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(v)||o.push({card:s,layer:c,row:h,col:v})}return o}function I0(){const e=["bad1","bad2","bad3"];return e[Math.floor(Math.random()*e.length)]}const va=`
:root{
  --bg0: #070814;
  --bg1: rgba(10,14,24,.92);

  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.65);

  --panel: rgba(10,14,24,.88);
  --stroke: rgba(255,255,255,.10);
  --stroke2: rgba(255,255,255,.18);

  --shadow: 0 18px 52px rgba(0,0,0,.45);
  --shadow2: 0 18px 56px rgba(0,0,0,.55);

  /* board sizing */
  --boardW: 860px;
  --boardPadTop: 18px;
  --boardPadBottom: 18px;

  /* hex geometry (7676767) — flat-top honeycomb */
  --hexWMain: 96px;
  --hexHMain: 84px;
  /* same-row spacing: point-to-point (full width between centers) */
  --hexStepX: var(--hexWMain);
  --hexGap: 0px;
  --hexOverlap: 0.0;
  /* grid footprint: 7 wide (point-to-point), 5.8 tall (with row overlap) */
  --hexGridWFactor: 7;
  --hexGridHFactor: 5.8;
  --hexAspect: 0.875; /* hexHMain / hexWMain */

  /* ✅ FIX: --hexW did not exist */
  --hexPitch: calc(var(--hexWMain) * (1 - var(--hexOverlap)) + var(--hexGap));

  --maxCols: 7;

  /* vertical center-to-center between row centers (flat-top honeycomb, -0.20 row-gap) */
  --hexStepY: calc(var(--hexHMain) * 0.80);

  /* height of JUST the 7 hex rows (no top/bottom padding) */
  --hexRowsH: calc((var(--hexStepY) * 6) + var(--hexHMain));

  /* height of rows + board padding */
  --hexFieldH: calc(var(--hexRowsH) + var(--boardPadTop) + var(--boardPadBottom));

  /* segment height should match a row block */
  --layerSegH: calc(var(--hexRowsH) / 7);
  --barH: 26px;

  /* side columns */
  --barColW: 86px;
  --barW: 26px;
  --sideColW: 340px;

  /* layer colors (overridden by themeVars inline) */
  --L1:#19ffb4;
  --L2:#67a5ff;
  --L3:#ffd36a;
  --L4:#ff7ad1;
  --L5:#a1ff5a;
  --L6:#a58bff;
  --L7:#ff5d7a;
}

*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  background: radial-gradient(1200px 900px at 50% 20%, rgba(60,80,180,.22), transparent 55%),
              radial-gradient(900px 650px at 20% 80%, rgba(120,255,210,.10), transparent 55%),
              var(--bg0);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  overflow:hidden;
}

.appRoot{
  min-height:100vh;
  position:relative;
}

.gameBg{
  position:absolute;
  inset:0;
  z-index:0;
  background-size: cover;
  background-position: center;
  opacity:1;
  filter: saturate(1.25) contrast(1.15) brightness(1.05);
}

/* =========================================================
   TOPBAR
========================================================= */
.topbar{
  height:64px;
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.08));
  backdrop-filter: blur(10px);
  position:relative;
  z-index:5;

  flex-wrap: nowrap;
  overflow: hidden;
}
.spacer{ flex:1; }

/* =========================================================
   PANELS / COMMON UI
========================================================= */
.screen.center{ height: calc(100vh - 64px); display:grid; place-items:center; padding:18px; }
.panel{
  width: min(980px, 92vw);
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 18px;
  backdrop-filter: blur(12px);
}
.panel.wide{ width:min(1040px, 94vw); }

.title{ font-size: 22px; font-weight: 900; letter-spacing: .3px; }
.sub{ margin-top:6px; color: var(--muted); font-size: 13px; }

.row{ display:flex; gap:10px; justify-content:flex-end; margin-top:14px; align-items:center; }
.hint{ margin-top:12px; color: var(--muted); font-size: 13px; }

.btn{
  border: 1px solid var(--stroke);
  background: rgba(255,255,255,.10);
  color: var(--text);
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.btn:hover{ background: rgba(255,255,255,.16); border-color: var(--stroke2); transform: translateY(-1px); }
.btn:active{ background: rgba(255,255,255,.22); transform: translateY(0); }
.btn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }

.btn.primary{
  background: rgba(120,220,255,.22);
  border-color: rgba(120,220,255,.35);
}
.btn.primary:hover{ background: rgba(120,220,255,.28); border-color: rgba(120,220,255,.50); }
.btn.primary:active{ background: rgba(120,220,255,.36); }

.grid{
  margin-top: 12px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}
@media (max-width: 700px){
  body{ overflow:auto; }
  .grid{ grid-template-columns: 1fr; }
}

.card{
  text-align: left;
  padding: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor: pointer;

  position: relative;
  border-radius: 22px;
  overflow: hidden;
  backface-visibility: hidden;
  will-change: transform;

  transition:
    transform 140ms ease,
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease;
}

.card:hover{
  transform: translateY(-1px);
  border-color: rgba(120,220,255,.35);
  background: rgba(0,0,0,.30);
  box-shadow: 0 14px 40px rgba(0,0,0,.32);
}

.card.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12), 0 16px 45px rgba(0,0,0,.42);
}

.cardTitle{ font-weight: 900; }
.cardDesc{ margin-top: 6px; color: var(--muted); font-size: 13px; }

.tracks{
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.tracksTitle{
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .4px;
}

.tracksRow{
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip{
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor: pointer;
}

.chip.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12);
}

/* =========================================================
   TOPBAR ITEMS
========================================================= */
.items{ display:flex; gap: 10px; flex-wrap: nowrap; }
.itemBtn{
  display:grid;
  grid-template-columns: 20px auto 18px;
  align-items:center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.itemBtn:hover{ background: rgba(0,0,0,.30); border-color: var(--stroke2); transform: translateY(-1px); }
.itemBtn:active{ transform: translateY(0); }
.itemBtn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }
.itemBtn.off{ opacity: .5; filter: grayscale(.2); }
.itemIcon{ font-size: 16px; line-height: 1; }
.itemName{ font-size: 12px; font-weight: 900; letter-spacing: .25px; }
.itemCharges{
  font-size: 12px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.08);
  text-align:center;
}

/* =========================================================
   DICE 3D
========================================================= */

.dice3d{
  --diceBox: 58px;
  --cube: 46px;
  --z: 23px;

  width: var(--diceBox);
  height: var(--diceBox);
  position: relative;
  display: grid;
  place-items: center;
  perspective: 700px;
}

.dice3d .cube{
  width: var(--cube);
  height: var(--cube);
  position: relative;
  transform-style: preserve-3d;
  transition: transform 180ms ease;
}

.dice3d.rolling .cube{ animation: cubeWobble .35s ease-in-out infinite; }

@keyframes cubeWobble{
  0%{ transform: rotateX(0deg) rotateY(0deg); }
  25%{ transform: rotateX(18deg) rotateY(-16deg); }
  50%{ transform: rotateX(-16deg) rotateY(22deg); }
  75%{ transform: rotateX(14deg) rotateY(16deg); }
  100%{ transform: rotateX(0deg) rotateY(0deg); }
}

.dice3d .face{
  position:absolute;
  inset:0;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35), 0 10px 22px rgba(0,0,0,.35);
  backface-visibility: hidden;
  transform: translateZ(var(--z));
}

.dice3d .face-front{  transform: rotateY(  0deg) translateZ(var(--z)); }
.dice3d .face-back{   transform: rotateY(180deg) translateZ(var(--z)); }
.dice3d .face-right{  transform: rotateY( 90deg) translateZ(var(--z)); }
.dice3d .face-left{   transform: rotateY(-90deg) translateZ(var(--z)); }
.dice3d .face-top{    transform: rotateX( 90deg) translateZ(var(--z)); }
.dice3d .face-bottom{ transform: rotateX(-90deg) translateZ(var(--z)); }

.dice3d.diceLg{
  --diceBox: 210px;
  --cube: 168px;
  --z: 84px;
  perspective: 1200px;
}

/* corners */
.diceCorner{
  position:absolute;
  width: 46%;
  aspect-ratio: 1 / 1;
  pointer-events:none;
  z-index: 5;

  background-image: var(--diceBorderUrl);
  background-repeat: no-repeat;
  background-size: contain;
  background-position: top left;

  opacity: 0.92;
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 10px rgba(255,60,0,.30));
}
.diceCorner.tl{ top: 0; left: 0; transform: rotate(0deg); }
.diceCorner.tr{ top: 0; right: 0; transform: rotate(90deg); }
.diceCorner.br{ bottom: 0; right: 0; transform: rotate(180deg); }
.diceCorner.bl{ bottom: 0; left: 0; transform: rotate(270deg); }

/* =========================================================
   GAME LAYOUT GRID
========================================================= */
.gameLayout{
  position: relative;
  z-index: 3;
  height: calc(100vh - 64px);
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  padding: 14px;
  grid-template-rows: 1fr;
  min-height: 0;
  opacity: 1;
}

.playColumn{
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr var(--sideColW);
  grid-template-rows: 1fr;
  gap: 14px;
}

/* =========================================================
   LAYER BARS
========================================================= */
.barWrap{
  z-index: 6;
}
.barWrap.barLeft{
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--boardPadTop);
  padding-bottom: var(--boardPadBottom);
}
.barLeft{ justify-content: flex-start; }

.barWrap.barTop{
  grid-column: 1 / -1;
  grid-row: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px 6px;
}

.layerBar{
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.18);
  box-shadow: 0 18px 40px rgba(0,0,0,.35);
  display: flex;
  position: relative;
}

.layerBar.layerBarHorizontal{
  width: min(100%, calc(var(--hexStepX) * var(--maxCols)));
  height: var(--barH);
  flex-direction: row;
}

.layerBar.rowShiftBar{
  width: var(--barW);
  height: var(--hexRowsH);
  flex-direction: column;
}

.barSeg{ opacity: .95; }
.layerBarHorizontal .barSeg{
  flex: 1 1 0;
  width: auto;
  height: 100%;
  min-width: 0;
}
.rowShiftBar .barSeg{
  height: var(--layerSegH);
  width: 100%;
}
.barSeg[data-layer="7"]{ background: var(--L7); }
.barSeg[data-layer="6"]{ background: var(--L6); }
.barSeg[data-layer="5"]{ background: var(--L5); }
.barSeg[data-layer="4"]{ background: var(--L4); }
.barSeg[data-layer="3"]{ background: var(--L3); }
.barSeg[data-layer="2"]{ background: var(--L2); }
.barSeg[data-layer="1"]{ background: var(--L1); }

.barSeg.isActive{
  filter: brightness(1.15);
  box-shadow:
    inset 0 0 0 2px rgba(255,255,255,.42),
    0 0 18px 6px rgba(255,255,255,.10);
  position: relative;
}

.rowShiftBar{ position: relative; }
.rowShiftBar .rowSeg{
  height: var(--layerSegH);
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.03);
}
.rowShiftLabel{
  font-weight: 1000;
  font-size: 12px;
  letter-spacing: .35px;
  color: rgba(255,255,255,.88);
  text-shadow: 0 2px 10px rgba(0,0,0,.45);
  user-select: none;
}

.goalMarker{
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 1000;
  font-size: 12px;
  letter-spacing: .2px;
  color: rgba(255, 220, 120, .95);
  background: rgba(0,0,0,.45);
  border: 1px solid rgba(255, 220, 120, .55);
  box-shadow:
    0 10px 22px rgba(0,0,0,.45),
    0 0 0 3px rgba(255, 220, 120, .10);
  z-index: 5;
  pointer-events: none;
}

.barPlayerMini{
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.18);
  box-shadow:
    0 10px 22px rgba(0,0,0,.40),
    0 0 0 3px rgba(255,255,255,.06);
  pointer-events: none;
  z-index: 4;
}

.barPlayerMini .miniSprite{
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
  background-image: var(--spriteImg);
  background-repeat: no-repeat;
  background-size:
    calc(var(--frameW) * var(--cols) * 1px)
    calc(var(--frameH) * var(--rows) * 1px);
  background-position:
    calc(var(--frameW) * -1px * var(--frameX))
    calc(var(--frameH) * -1px * var(--frameY));
  transform: scale(0.22);
  transform-origin: center;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,.55));
}

/* =========================================================
   BOARD WRAP
========================================================= */
.boardWrap{
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.50);
  box-shadow: var(--shadow2);
  overflow: hidden;
  --boardInset: calc((100% - var(--barColW) - var(--boardW)) / 2);
  display: grid;
  grid-template-columns: var(--barColW) 1fr;
  grid-template-rows: auto 1fr;
  align-items: stretch;
  opacity: 1;
  height: 100%;
  min-height: 0;
}

.boardLayerBg{
  position:absolute; inset:0;
  background-size: cover;
  background-position: center;
  opacity: 1;
  transform: scale(1.02);
  animation: bgFadeIn 220ms ease;
  z-index: 1;
}
@keyframes bgFadeIn{
  from{ opacity: 0; }
  to{ opacity: .45; }
}

.boardScroll{
  grid-column: 2;
  grid-row: 2;
  position: relative;
  z-index: 3;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.barWrap.barLeft{ grid-column: 1; grid-row: 2; }

.board{
  width: calc(var(--hexStepX) * var(--maxCols));
  margin: 0 auto;
  padding: var(--boardPadTop) 0 var(--boardPadBottom);
  position: relative;
  height: var(--hexFieldH);
  overflow: visible;
}

/* =========================================================
   HEX GRID (7676767) — shared 14-col honeycomb grid
========================================================= */
.hexGrid{
  display: grid;
  grid-template-columns: repeat(14, calc(var(--hexStepX) / 2));
  width: calc(var(--hexStepX) * var(--maxCols));
  grid-auto-rows: var(--hexHMain);
  row-gap: calc(var(--hexHMain) * -0.20);
  margin: 0 auto;
  position: relative;
}

.hexRow{
  display: contents;
}

/* =========================================================
   HEX SLOTS + HEX BUTTON
========================================================= */
.hexSlot{
  width: 100%;
  height: var(--hexHMain);
  display: grid;
  place-items: center;
  position: relative;
  overflow: visible;
}
.hexSlot.empty{ opacity: 0; }

.hex{
  width: var(--hexWMain);
  height: var(--hexHMain);

  /* ✅ FIX: spacing is controlled by .hexSlot; remove old flex-era margin hacks */
  margin: 0;

  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  padding: 0;
  border: 0;
  background: rgba(255,255,255,.14);
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0,0,0,.35) inset, 0 6px 16px rgba(0,0,0,.10);
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.35));
  transition: transform 140ms ease, filter 140ms ease;
  position: relative;
  z-index: 1;
  overflow: visible;
  --hexGlow: rgba(120,255,210,.51);
}
.hex:hover{
  transform: translateY(-2px);
  filter: drop-shadow(0 14px 22px rgba(0,0,0,.45));
}
.hex:disabled{
  opacity: .75;
  cursor: not-allowed;
  transform:none;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.25));
}

/* =========================================================
   HEX INNER TILE + STATES
========================================================= */
.hexAnchor{ position: relative; width: 100%; height: 100%; overflow: visible; }

.hexInner{
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  border: 1px solid rgba(255,255,255,.12);
  /* PNG art via --tileArt; gradients below remain as fallback if image is absent or fails */
  background-image:
    var(--tileArt, none),
    radial-gradient(circle at 30% 25%, rgba(120,255,210,.12), transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(120,150,255,.12), transparent 55%);
  background-color: rgba(0,0,0,.34);
  background-size: cover, auto, auto;
  background-position: center, center, center;
  background-repeat: no-repeat, no-repeat, no-repeat;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35);
  overflow:visible;
}

.hexCoords{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 14;
}

.hexId{
  font-size: calc(var(--hexWMain) * 0.26);
  font-weight: 900;
  color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    -1.5px -1.5px 0 #000,
     1.5px -1.5px 0 #000,
    -1.5px  1.5px 0 #000,
     1.5px  1.5px 0 #000,
     0 -1.5px 0 #000,
     0  1.5px 0 #000,
    -1.5px  0   0 #000,
     1.5px  0   0 #000;
}

.hexMarks{
  position:absolute;
  right: 9px;
  bottom: 9px;
  display:flex;
  gap: 6px;
  align-items: flex-end;
  z-index: 20;
}
.mark{
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display:grid;
  place-items:center;
  font-weight: 900;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  color: rgba(60, 163, 255, 0.8);
}
.mark.g{
  border-color: rgba(255,211,106,.35);
  color: rgba(255,211,106,.95);
  background: rgba(255,211,106,.10);
}
.mark.t{
  border-color: rgba(255,122,209,.35);
  color: rgba(255,122,209,.95);
  background: rgba(255,122,209,.10);
}

/* =========================================================
   REACHABLE HEX HIGHLIGHT
========================================================= */
.hex.reach .hexInner{
  position: relative;
  border-color: color-mix(in srgb, var(--hexGlow) 90%, white 10%);
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.4);
}

.hex.reach .hexInner::after{
  content:"";
  position:absolute;
  inset: 1px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  padding: 6px;
  pointer-events:none;
  background:
    conic-gradient(
      from var(--reachSpin),
      color-mix(in srgb, var(--hexGlow) 0%, transparent) 0deg,
      color-mix(in srgb, var(--hexGlow) 35%, transparent) 40deg,
      color-mix(in srgb, var(--hexGlow) 100%, transparent) 90deg,
      color-mix(in srgb, var(--hexGlow) 35%, transparent) 140deg,
      color-mix(in srgb, var(--hexGlow) 0%, transparent) 210deg,
      color-mix(in srgb, var(--hexGlow) 0%, transparent) 360deg
    );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 1;
  filter:
    drop-shadow(0 0 10px color-mix(in srgb, var(--hexGlow) 95%, transparent))
    drop-shadow(0 0 22px color-mix(in srgb, var(--hexGlow) 35%, transparent));
  animation:
    reachSpin 1.8s linear infinite,
    reachPulse .9s ease-in-out infinite;
  transform: translateZ(0);
  will-change: transform;
}

@property --reachSpin {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes reachSpin {
  to { --reachSpin: 360deg; }
}

@keyframes reachPulse {
  0%,100% { opacity: .85; }
  50%     { opacity: 1; }
}

.hex.reach{
  filter:
    drop-shadow(0 12px 18px rgba(0,0,0,.40))
    drop-shadow(0 0 10px color-mix(in srgb, var(--hexGlow) 55%, transparent));
}

/* =========================================================
   START PORTAL FX
========================================================= */
.hex.portalStart,
.hex.portalUp,
.hex.portalDown{
  --portalC: var(--hexGlow);
  z-index: 4;
  filter:
    drop-shadow(0 10px 16px rgba(0,0,0,.35))
    drop-shadow(0 0 18px color-mix(in srgb, var(--portalC) 55%, transparent))
    drop-shadow(0 0 34px color-mix(in srgb, var(--portalC) 30%, transparent));
}

.portalFx{
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 12;
  overflow: visible;
}

.portalFx::before{
  content: "";
  position: absolute;
  inset: 0;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  background:
    radial-gradient(circle at 50% 45%,
      rgba(0,0,0,.18),
      rgba(0,0,0,.62) 72%);
  z-index: 0;
}

.hex .hexInner .pAura,
.hex .hexInner .pRunes,
.hex .hexInner .pVortex,
.hex .hexInner .pWell,
.hex .hexInner .pShine,
.hex .hexInner .pOrbs,
.hex .hexInner .pRim,
.hex .hexInner .pOval{
  position:absolute;
  pointer-events:none;
}

.hex .hexInner .pRunes,
.hex .hexInner .pVortex,
.hex .hexInner .pWell,
.hex .hexInner .pShine,
.hex .hexInner .pOrbs{
  inset:0;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  z-index: 2;
}

.hex.portalStart .hexInner,
.hex.portalUp .hexInner,
.hex.portalDown .hexInner{
  border-color: color-mix(in srgb, var(--portalC) 70%, rgba(255,255,255,.18));
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    inset 0 0 28px color-mix(in srgb, var(--portalC) 28%, transparent),
    0 0 0 3px color-mix(in srgb, var(--portalC) 28%, transparent),
    0 0 22px color-mix(in srgb, var(--portalC) 38%, transparent);
}

.hex.portalStart .hexInner .pAura,
.hex.portalUp .hexInner .pAura,
.hex.portalDown .hexInner .pAura{
  inset:-22%;
  border-radius: 999px;
  clip-path: none;
  z-index: 1;
  background:
    radial-gradient(circle at 50% 50%,
      color-mix(in srgb, var(--portalC) 85%, transparent),
      transparent 58%),
    radial-gradient(circle at 60% 78%,
      rgba(0,255,195,0.28),
      transparent 64%);
  filter: blur(10px) saturate(1.35);
  opacity: 1;
  animation: portalBreathe 2.6s ease-in-out infinite;
}
@keyframes portalBreathe{
  0%,100%{ transform: scale(0.99); filter: blur(10px) saturate(1.2); }
  50%{ transform: scale(1.14); filter: blur(14px) saturate(1.45); }
}

.hex.portalStart .hexInner .pVortex{
  inset: 6%;
  overflow:hidden;
  filter: saturate(1.35);
  opacity: 1;
  z-index: 4;
}
.hex.portalStart .hexInner .pVortex::before{
  content:"";
  position:absolute; inset:-25%;
  background:
    conic-gradient(from 0deg,
      rgba(0,0,0,0) 0 10%,
      color-mix(in srgb, var(--portalC) 85%, transparent) 18%,
      rgba(0,255,195,0.35) 28%,
      rgba(255,80,170,0.24) 40%,
      color-mix(in srgb, var(--portalC) 65%, transparent) 54%,
      rgba(0,0,0,0) 70% 100%),
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0.0) 0 38%,
      rgba(0,0,0,0.82) 64% 100%);
  mix-blend-mode: screen;
  animation: portalVortex 1.45s linear infinite;
}
@keyframes portalVortex{
  0%{ transform: rotate(0deg) scale(1.03); }
  100%{ transform: rotate(360deg) scale(1.03); }
}

.hex.portalStart .hexInner .pRunes{
  inset: 2%;
  opacity: 0.95;
  z-index: 5;
  background:
    repeating-conic-gradient(
      from 10deg,
      rgba(255,255,255,0.0) 0 10deg,
      color-mix(in srgb, var(--portalC) 70%, transparent) 10deg 12deg,
      rgba(255,255,255,0.0) 12deg 18deg
    );
  filter: blur(0.35px);
  animation: portalRunes 3.4s linear infinite reverse;
  mix-blend-mode: screen;
}
@keyframes portalRunes{
  0%{ transform: rotate(0deg); }
  100%{ transform: rotate(360deg); }
}

.hex.portalStart .hexInner .pWell{
  inset: 22%;
  z-index: 3;
  background:
    radial-gradient(circle at 50% 52%,
      rgba(0,0,0,0.0) 0 30%,
      rgba(0,0,0,0.92) 68% 100%),
    radial-gradient(circle at 45% 40%,
      rgba(255,255,255,0.18),
      transparent 55%);
  opacity: 1;
}

.hex.portalStart .hexInner .pShine{
  inset:-20%;
  z-index: 6;
  clip-path: none;
  background:
    conic-gradient(from 210deg,
      transparent 0 45%,
      rgba(255,255,255,0.28) 48%,
      transparent 52% 100%);
  opacity:0.55;
  mix-blend-mode: screen;
  animation: portalShine 1.6s linear infinite;
}
@keyframes portalShine{
  0%{ transform: rotate(0deg); }
  100%{ transform: rotate(360deg); }
}

/* =========================================================
   PORTAL TILE FX (uses destination color: --portalC)
========================================================= */
.hex.portalUp .hexInner .pOrbs,
.hex.portalDown .hexInner .pOrbs{
  inset: 0;
  z-index: 3;
  background:
    radial-gradient(8px 7px at 20% 30%, rgba(255,255,255,0.28), transparent 58%),
    radial-gradient(9px 8px at 35% 22%, color-mix(in srgb, var(--portalC) 55%, transparent), transparent 58%),
    radial-gradient(8px 7px at 55% 18%, rgba(0,255,220,0.28), transparent 58%),
    radial-gradient(9px 8px at 72% 26%, color-mix(in srgb, var(--portalC) 45%, transparent), transparent 58%);
  mix-blend-mode: screen;
  filter: blur(0.2px);
  opacity: 1;
  animation: pOrbs 3.2s ease-in-out infinite;
}
@keyframes pOrbs{
  0%,100%{ transform: translateY(0); opacity:.85; }
  50%{ transform: translateY(-6px); opacity:1; }
}

.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval,
.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim{
  left:50%;
  top:50%;
  width: 88%;
  height: 52%;
  clip-path: none;
  z-index: 5;
  transform:
    translate(-50%,-50%)
    rotate(-18deg)
    skewX(-10deg)
    perspective(800px)
    rotateX(60deg);
  border-radius: 999px;
}

.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval{
  inset: auto;
  overflow:visible;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0) 0 34%,
      rgba(0,0,0,0.92) 68%),
    radial-gradient(circle at 45% 50%,
      color-mix(in srgb, var(--portalC) 55%, transparent),
      transparent 62%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 0 18px color-mix(in srgb, var(--portalC) 45%, transparent);
}
.hex.portalUp .hexInner .pOval::before,
.hex.portalDown .hexInner .pOval::before{
  content:"";
  position:absolute;
  inset:-32%;
  background:
    conic-gradient(
      rgba(0,0,0,0) 0 14%,
      color-mix(in srgb, var(--portalC) 100%, transparent) 22%,
      rgba(0,255,220,0.32) 32%,
      rgba(255,80,170,0.20) 44%,
      color-mix(in srgb, var(--portalC) 75%, transparent) 58%,
      rgba(0,0,0,0) 72% 100%);
  mix-blend-mode: screen;
  animation: pSpin 1.25s linear infinite;
}
@keyframes pSpin{ to{ transform: rotate(360deg); } }

.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim{
  inset:auto;
  z-index: 6;
  background:
    conic-gradient(
      transparent 0 18%,
      rgba(255,255,255,0.32) 22%,
      color-mix(in srgb, var(--portalC) 100%, transparent) 32%,
      transparent 55% 100%);
  filter: blur(0.4px);
  mix-blend-mode: screen;
  animation: pRim 1.55s linear infinite;
}
@keyframes pRim{
  to{
    transform:
      translate(-50%,-50%)
      rotate(-18deg)
      skewX(-10deg)
      perspective(800px)
      rotateX(60deg)
      rotate(360deg);
  }
}

/* =========================================================
   GHOST GRID (unshifted reference)
========================================================= */
.ghostGrid{
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  opacity: 0.35;
  display: grid;
  grid-template-columns: repeat(14, calc(var(--hexStepX) / 2));
  grid-auto-rows: var(--hexHMain);
  row-gap: calc(var(--hexHMain) * -0.20);
}

.ghostRow{
  display: contents;
}

.ghostSlot{
  width: 100%;
  height: var(--hexHMain);
  display: grid;
  place-items: center;
}

.ghostHex{
  width: var(--hexWMain);
  height: var(--hexHMain); /* ✅ FIX: match real hex height */
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  border: 1px dashed rgba(255,255,255,.35);
  background: rgba(0,0,0,.12);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
}

/* =========================================================
   SPRITE
========================================================= */
.playerSpriteSheet{
  position: absolute;
  left: 50%;
  top: 86%;
  width: calc(var(--frameW) * 1px);
  height: calc(var(--frameH) * 1px);

  --spriteScale: 0.78;
  --footX: -10px;
  --footY: 0px;

  transform:
    translate(calc(-50% + var(--footX)), calc(-100% + var(--footY)))
    scale(var(--spriteScale));
  transform-origin: 50% 100%;

  z-index: 20;
  pointer-events: none;
  image-rendering: pixelated;

  background-image: var(--spriteImg);
  background-repeat: no-repeat;
  background-size:
    calc(var(--frameW) * var(--cols) * 1px)
    calc(var(--frameH) * var(--rows) * 1px);
  background-position:
    calc(var(--frameW) * -1px * var(--frameX))
    calc(var(--frameH) * -1px * var(--frameY));

  filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
}

/* =========================================================
   SIDEBAR (STATUS + LOG)
========================================================= */
.side{
  display:grid;
  grid-auto-rows: min-content;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}
.panelMini{
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(10,14,24,.88);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(10px);
}
.miniTitle{
  margin: 0 0 10px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .45px;
  color: rgba(255,255,255,.82);
  font-weight: 900;
}
.miniRow{
  display:flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(255,255,255,.08);
}
.miniRow:last-child{ border-bottom: none; }
.miniRow .k{ color: var(--muted); font-size: 12px; }
.miniRow .v{ font-weight: 900; font-size: 12px; }

.log{ max-height: 340px; overflow:auto; padding-right: 6px; }
.logRow{
  display:grid;
  grid-template-columns: 58px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.logRow:last-child{ border-bottom:none; }
.lt{ color: rgba(255,255,255,.55); font-size: 12px; font-variant-numeric: tabular-nums; }
.lm{ font-size: 13px; color: rgba(255,255,255,.88); }
.logRow.ok .lm{ color: rgba(70,249,180,.92); }
.logRow.bad .lm{ color: rgba(255,93,122,.92); }
.logRow.info .lm{ color: rgba(119,168,255,.92); }

/* =========================================================
   DECK CARDS
========================================================= */

.hexDeckOverlay{
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;

  --cardGlow: rgba(120,255,210,.65);
  --deckPadX: 14px;
  --deckPadY: 14px;
}

.hexDeckCol{ display: contents; }

.hexDeckCard{
  position: absolute;

  width: clamp(187px, 18vw, 286px);
  max-width: max(150px, calc(var(--boardInset) - (var(--deckPadX) * 2)));

  aspect-ratio: 3 / 4;
  border-radius: 22px;
  overflow: hidden;

  isolation: isolate;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;

  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(135deg, var(--a), var(--b));
  box-shadow:
    0 18px 48px rgba(0,0,0,.55),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

.hexDeckCard.cosmic{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(-45%);
}
.hexDeckCard.risk{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(-45%);
}
.hexDeckCard.terrain{
  right: calc(var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(45%);
}
.hexDeckCard.shadow{
  right: calc(var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(45%);
}

.hexDeckCard .deckFx{
  position:absolute;
  inset:0;
  border-radius: inherit;
  pointer-events:none;
  overflow:hidden;
  transform: translateZ(0);
}

.hexDeckCard .deckFx::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;

  background:
    radial-gradient(120% 90% at 40% 20%,
      color-mix(in srgb, var(--a) 35%, white 10%),
      transparent 60%),
    radial-gradient(90% 70% at 70% 80%,
      color-mix(in srgb, var(--b) 35%, white 6%),
      transparent 60%),
    linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px) 0 0 / 18px 16px,
    linear-gradient(30deg, rgba(0,0,0,.20) 1px, transparent 1px) 0 0 / 18px 16px,
    linear-gradient(150deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 18px 16px;

  opacity: .55;
  mix-blend-mode: overlay;
}

@keyframes deckInnerDrift{
  from { transform: translate3d(-90%,-90%,0) rotate(0deg); }
  to   { transform: translate3d( 90%, 90%,0) rotate(360deg); }
}

.hexDeckCard .deckFx::after{
  content:"";
  position:absolute;
  inset:-25%;
  border-radius: inherit;

  background:
    repeating-linear-gradient(
      115deg,
      rgba(255,255,255,0) 0px,
      rgba(255,255,255,0) 10px,
      rgba(255,255,255,.18) 14px,
      rgba(255,255,255,0) 18px
    ),
    repeating-linear-gradient(
      25deg,
      rgba(0,0,0,0) 0px,
      rgba(0,0,0,0) 12px,
      color-mix(in srgb, var(--b) 25%, transparent) 16px,
      rgba(0,0,0,0) 22px
    );

  background-size: 180% 180%;
  opacity: .38;
  mix-blend-mode: screen;

  will-change: transform;
  animation: deckInnerDrift 8s linear infinite;
}

@property --spin {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes deckBorderSpin{
  to { --spin: 360deg; }
}

@keyframes deckBorderBreath{
  0%,100%{
    opacity:.95;
    filter: drop-shadow(0 0 10px var(--cardGlow));
  }
  50%{
    opacity:1;
    filter: drop-shadow(0 0 16px var(--cardGlow));
  }
}

.hexDeckCard::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;
  padding: 2px;
  pointer-events:none;

  background:
    conic-gradient(
      from var(--spin),
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 0deg,
      color-mix(in srgb, var(--cardGlow) 65%, rgba(255,255,255,.10)) 90deg,
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 180deg,
      color-mix(in srgb, var(--cardGlow) 65%, rgba(255,255,255,.10)) 270deg,
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 360deg
    );

  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;

  animation:
    deckBorderSpin 2.8s linear infinite,
    deckBorderBreath 1.35s ease-in-out infinite;
}

.cardBadge{
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 22;
}

.hexSlot > .cardBadge.hexDeckCard{
  position: absolute;
  left: 50%;
  top: 0;
  right: auto;
  bottom: auto;
  /* match mobile deck row: 42×56 portrait, radius 10 */
  width: calc(var(--hexWMain) * 0.55 * 3 / 4);
  height: calc(var(--hexWMain) * 0.55);
  max-width: none;
  aspect-ratio: unset;
  transform: translate(-50%, -50%);
  border-radius: calc(var(--hexWMain) * 0.55 * 10 / 56);
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(135deg, var(--a), var(--b));
  box-shadow:
    0 8px 18px rgba(0,0,0,.45),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

.hexSlot > .cardBadge.hexDeckCard.cosmic,
.hexSlot > .cardBadge.hexDeckCard.risk,
.hexSlot > .cardBadge.hexDeckCard.terrain,
.hexSlot > .cardBadge.hexDeckCard.shadow{
  left: 50%;
  top: 0;
  right: auto;
  bottom: auto;
  transform: translate(-50%, -50%);
}

.cardBadge .deckFx{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

/* hex card markers reuse hexDeckCard theme vars */
.hexDeckCard.cosmic  { --a:#0C1026; --b:#1A1F4A; }
.hexDeckCard.risk    { --a:#12090A; --b:#6E0F1B; }
.hexDeckCard.terrain { --a:#0E3B2E; --b:#1FA88A; }
.hexDeckCard.shadow  { --a:#1B1B1E; --b:#2A1E3F; }

/* Mobile deck row (below board) */
.mobileDeckRow{
  display: none;
  gap: 8px;
  padding: 0 2px;
  justify-content: space-between;
  align-items: center;
}

.mobileDeckRow .mobileDeckCard{
  position: relative;
  flex: 0 0 calc(56px * 3 / 4);
  width: calc(56px * 3 / 4);
  height: 56px;
  max-width: calc(56px * 3 / 4);
  max-height: 56px;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  isolation: isolate;
  left: auto;
  right: auto;
  top: auto;
  bottom: auto;
  margin: 0;
  transform: none;
}

.mobileDeckRow .mobileDeckCard.cosmic,
.mobileDeckRow .mobileDeckCard.risk,
.mobileDeckRow .mobileDeckCard.terrain,
.mobileDeckRow .mobileDeckCard.shadow{
  transform: none;
}

.mobileDeckCard .deckFx{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

.statusGrid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

/* =========================================================
   CARD FLIP OVERLAY (FULLSCREEN)
========================================================= */

.cardFlipOverlay{
  --flipDur: 1400ms;

  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(10px);
  pointer-events: none;
  animation: cardFlipFade var(--flipDur) ease-out forwards;
}

@keyframes cardFlipFade{
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}

.cardFlipCard{
  width: min(420px, 78vw);
  aspect-ratio: 3 / 4;
  border-radius: 28px;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow:
    0 28px 90px rgba(0,0,0,.65),
    0 0 0 1px rgba(255,255,255,.06) inset;
  overflow: hidden;
  position: relative;
  transform-origin: center;
  animation: cardFlipPop var(--flipDur) ease-out forwards;
}

@keyframes cardFlipPop{
  0%   { transform: translateY(18px) scale(.92) rotateX(12deg); filter: blur(2px); opacity: 0; }
  12%  { transform: translateY(0)    scale(1)  rotateX(0deg);  filter: blur(0);  opacity: 1; }
  70%  { transform: translateY(0)    scale(1)  rotateX(0deg);  filter: blur(0);  opacity: 1; }
  100% { transform: translateY(-10px) scale(.98); filter: blur(1px); opacity: 0; }
}

.cardFlipCard.cosmic  { background: linear-gradient(135deg,#0C1026,#1A1F4A); }
.cardFlipCard.risk    { background: linear-gradient(135deg,#12090A,#6E0F1B); }
.cardFlipCard.terrain { background: linear-gradient(135deg,#0E3B2E,#1FA88A); }
.cardFlipCard.shadow  { background: linear-gradient(135deg,#1B1B1E,#2A1E3F); }

.cardFlipCard::before{
  content:"";
  position:absolute;
  inset:-30%;
  background:
    radial-gradient(80% 60% at 30% 20%, rgba(255,255,255,.14), transparent 65%),
    radial-gradient(70% 55% at 75% 80%, rgba(255,255,255,.10), transparent 65%),
    repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 14px, rgba(255,255,255,.10) 18px, rgba(255,255,255,0) 22px);
  opacity: .55;
  mix-blend-mode: overlay;
  animation: flipDrift var(--flipDur) linear forwards;
}

@keyframes flipDrift{
  from { transform: translate3d(-12%, -10%, 0) rotate(0deg); }
  to   { transform: translate3d( 12%,  10%, 0) rotate(14deg); }
}

.cardFlipCard::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;
  padding: 2px;
  pointer-events:none;
  background:
    conic-gradient(
      from 0deg,
      rgba(255,255,255,.28),
      rgba(255,255,255,.08),
      rgba(255,255,255,.28)
    );

  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  opacity: .9;
}

.cardFlipLabel{
  position:absolute;
  left: 18px;
  bottom: 16px;
  font-weight: 1000;
  letter-spacing: .45px;
  font-size: 13px;
  color: rgba(255,255,255,.90);
  text-transform: uppercase;
  text-shadow: 0 10px 26px rgba(0,0,0,.55);
}

.cardFlipVillain{
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 5;
  opacity: 0;
  animation: villainFadeIn 700ms ease-out forwards;
  animation-delay: 350ms;
  filter: drop-shadow(0 18px 40px rgba(0,0,0,.55));
}

@keyframes villainFadeIn{
  from { opacity: 0; transform: scale(1.02); }
  to   { opacity: 1; transform: scale(1.00); }
}

/* Risk Step B: pop like blue, flip to villain, controls below */
.cardFlipOverlay.riskEncounter{
  --flipDur: 1400ms;
  background: rgba(0,0,0,.80);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  animation: riskOverlayIn 320ms ease-out forwards;
}

@keyframes riskOverlayIn{
  from { opacity: 0; }
  to   { opacity: 1; }
}

.riskEncounterStack{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: min(420px, 92vw);
}

.cardFlipCard.riskReveal{
  width: min(420px, 78vw);
  aspect-ratio: 3 / 4;
  border-radius: 28px;
  position: relative;
  transform-style: preserve-3d;
  transform-origin: center;
  animation: riskCardPopThenFlip var(--flipDur) ease-out forwards;
  overflow: visible;
  background: transparent;
  border: none;
  box-shadow: none;
}

.cardFlipCard.riskReveal::before,
.cardFlipCard.riskReveal::after{
  display: none;
}

@keyframes riskCardPopThenFlip{
  0%   { transform: translateY(18px) scale(.92) rotateY(0deg); opacity: 0; }
  12%  { transform: translateY(0)    scale(1)  rotateY(0deg); opacity: 1; }
  62%  { transform: translateY(0)    scale(1)  rotateY(0deg); opacity: 1; }
  100% { transform: translateY(0)    scale(1)  rotateY(180deg); opacity: 1; }
}

.cardFlipFace{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  backface-visibility: hidden;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow:
    0 28px 90px rgba(0,0,0,.65),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

.cardFlipFace.front{
  background: linear-gradient(135deg,#12090A,#6E0F1B);
  transform: rotateY(0deg);
}

.cardFlipFace.back{
  transform: rotateY(180deg);
  background: #000;
}

.cardFlipFace.back img{
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.riskEncounterControls{
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  opacity: 0;
  pointer-events: none;
  animation: riskControlsIn 420ms ease-out 1.05s forwards;
}

@keyframes riskControlsIn{
  to{
    opacity: 1;
    pointer-events: auto;
  }
}

.riskEncounterControls .encounterActionRow{
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.riskEncounterControls .encounterInfo{
  text-align: center;
}

/* =========================================================
   FLY-OUT CARD (deck -> center -> flip)
========================================================= */
.flyCardOverlay{
  position: fixed;
  inset: 0;
  z-index: 1900;
  pointer-events: none;
}

.flyCard{
  position: fixed;
  left: 0;
  top: 0;

  width: var(--fromW);
  height: var(--fromH);

  transform-style: preserve-3d;
  transform-origin: center;
  border-radius: var(--fromRadius, 10px);
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(255,255,255,.18);

  transform: translate3d(var(--fromX), var(--fromY), 0) scale(1);

  animation: flyToCenter 1.15s ease-out forwards;
  box-shadow: 0 8px 18px rgba(0,0,0,.45);
}

.flyCard .deckFx{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

.flyCard.cosmic  { background: linear-gradient(135deg,#0C1026,#1A1F4A); }
.flyCard.risk    { background: linear-gradient(135deg,#12090A,#6E0F1B); }
.flyCard.terrain { background: linear-gradient(135deg,#0E3B2E,#1FA88A); }
.flyCard.shadow  { background: linear-gradient(135deg,#1B1B1E,#2A1E3F); }

.flyFace{
  position:absolute;
  inset:0;
  backface-visibility: hidden;
  border-radius: inherit;
  overflow:hidden;
}
.flyFront{ transform: rotateY(0deg); }
.flyBack{
  transform: rotateY(180deg);
  filter: brightness(1.05) saturate(1.1);
}

.flyLabel{
  position:absolute;
  left: 18px;
  bottom: 16px;
  font-weight: 1000;
  letter-spacing: .45px;
  font-size: 13px;
  color: rgba(255,255,255,.92);
  text-transform: uppercase;
  text-shadow: 0 10px 26px rgba(0,0,0,.55);
}

@keyframes flyToCenter{
  0%{
    opacity: 1;
    transform: translate3d(var(--fromX), var(--fromY), 0)
               scale(1)
               rotateY(0deg);
  }

  45%{
    opacity: 1;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(0deg);
  }

  70%{
    opacity: 1;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(0deg);
  }

  85%{
    opacity: 1;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(180deg);
  }

  100%{
    opacity: 0;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(180deg);
  }
}

/* =========================================================
   ENCOUNTER SCENE
========================================================= */
.encounterScene{
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.62);
  backdrop-filter: blur(10px);
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

.encounterGrid{
  width: min(1200px, 94vw);
  display: grid;
  grid-template-columns: minmax(280px, 480px) 1fr;
  gap: 48px;
  align-items: center;
}

.encounterCard{
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: min(72vh, 640px);
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 28px 90px rgba(0,0,0,.65);
  background: rgba(0,0,0,.25);
}

.encounterCard.riskCard {
  background: linear-gradient(135deg,#12090A,#6E0F1B);
  position: relative;
  overflow: hidden;
}

.riskCardFx {
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(80% 60% at 30% 20%, rgba(255,255,255,.12), transparent 65%),
    radial-gradient(70% 55% at 75% 80%, rgba(255,255,255,.08), transparent 65%);
  mix-blend-mode: overlay;
  animation: riskDrift 8s linear infinite;
}

@keyframes riskDrift {
  from { transform: translate3d(-12%, -10%, 0) rotate(0deg); }
  to   { transform: translate3d( 12%,  10%, 0) rotate(14deg); }
}

.riskVillainImg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 5;
  animation: villainFadeIn 700ms ease-out forwards;
  animation-delay: 300ms;
  filter: drop-shadow(0 18px 40px rgba(0,0,0,.55));
}

.encounterRight{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.encounterActionRow{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.encounterInfo{
  text-align: center;
  width: min(520px, 100%);
}

.encounterButtons{
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 12px;
}

.encounterTitle{
  font-size: 20px;
  font-weight: 1000;
  letter-spacing: .45px;
  text-transform: uppercase;
}

.encounterSub{
  margin-top: 8px;
  font-size: 14px;
  color: rgba(255,255,255,.82);
}

.encounterTries{
  display: inline-block;
  margin-left: 12px;
  opacity: .85;
}

.encounterRollPill{
  margin-top: 12px;
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.25);
  font-weight: 900;
}

@media (max-width: 860px){
  .encounterScene{
    place-items: start center;
    align-content: start;
    padding: 10px 10px 24px;
  }

  .encounterGrid{
    grid-template-columns: 1fr;
    gap: 12px;
    width: 100%;
    max-width: 100%;
    margin: auto 0;
  }

  .encounterCard{
    aspect-ratio: 16 / 10;
    max-height: 34vh;
    min-height: 120px;
    border-radius: 18px;
  }

  .encounterRight{
    align-items: stretch;
    width: 100%;
  }

  .encounterActionRow{
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
    gap: 12px;
  }

  .dice3d.diceLg{
    --diceBox: 88px;
    --cube: 70px;
    --z: 35px;
    perspective: 700px;
    flex: 0 0 auto;
    margin-top: 4px;
  }

  .encounterInfo{
    text-align: left;
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .encounterTitle{
    font-size: 16px;
  }

  .encounterSub{
    font-size: 12px;
    line-height: 1.35;
  }

  .encounterTries{
    display: block;
    margin-left: 0;
    margin-top: 4px;
  }

  .encounterButtons{
    justify-content: flex-start;
    margin-top: 10px;
    gap: 8px;
  }

  .encounterButtons .btn{
    padding: 9px 14px;
    font-size: 14px;
    border-radius: 12px;
  }

  .encounterRollPill{
    margin-top: 8px;
    font-size: 12px;
    padding: 6px 10px;
  }
}

@media (max-width: 980px){
  body{ overflow:hidden; }
  .appRoot.game{
    height: 100dvh;
    overflow: hidden;
  }

  .topbar{
    height: 52px;
    padding: 6px 8px;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .itemBtn{ padding: 6px 8px; gap: 4px; }
  .itemName{ display: none; }
  .itemCharges{ font-size: 11px; }
  .btn{ padding: 6px 10px; font-size: 12px; border-radius: 10px; }

  .gameLayout{
    height: calc(100dvh - 52px);
    padding: 8px;
    gap: 8px;
    overflow: hidden;
  }

  .playColumn{
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto auto;
    gap: 8px;
    height: 100%;
    min-height: 0;
  }

  .boardWrap{
    grid-column: 1;
    grid-row: 1;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 14px;
  }

  .barWrap.barLeft{ display: none !important; }

  .barWrap.barTop{
    grid-column: 1;
    grid-row: 1;
    padding: 6px 8px 4px;
  }

  .barWrap.barTop .layerBarHorizontal{
    width: min(100%, calc(var(--hexStepX) * var(--maxCols)));
    height: 22px;
  }

  .barWrap.barTop .barPlayerMini{
    width: 20px;
    height: 20px;
  }

  .barWrap.barTop .goalMarker{
    width: 18px;
    height: 18px;
    font-size: 9px;
  }

  .boardScroll{
    grid-column: 1;
    grid-row: 2;
    padding: 4px 2px 4px 6px;
    overflow: hidden;
    height: 100%;
  }

  .board{
    width: calc(var(--hexStepX) * var(--maxCols));
    max-width: 100%;
  }

  .hexDeckOverlay{ display: none; }

  .mobileDeckRow{
    display: flex;
    grid-row: 2;
    flex-shrink: 0;
  }

  .side{
    grid-row: 3;
    order: unset;
    gap: 0;
    overflow: hidden;
    min-height: 0;
  }

  .logPanel{ display: none; }

  .statusPanel{
    padding: 10px 12px;
  }

  .statusPanel .miniTitle{
    margin-bottom: 6px;
  }

  .statusGrid{
    grid-template-columns: 1fr 1fr;
    gap: 2px 10px;
  }

  .statusGrid .miniRow{
    padding: 4px 0;
    border-bottom: none;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }

  .statusGrid .miniRow .k,
  .statusGrid .miniRow .v{
    font-size: 11px;
  }

  :root{
    --boardPadTop: 4px;
    --boardPadBottom: 4px;
    --barW: 20px;
    --barH: 22px;
    /* one-screen fit: topbar + layer bar + deck row + status + gaps */
    --hexWMain: min(
      64px,
      calc((100vw - 32px) / var(--hexGridWFactor)),
      calc((100dvh - 232px) / (var(--hexGridHFactor) * var(--hexAspect)))
    );
    --hexHMain: calc(var(--hexWMain) * var(--hexAspect));
  }

  .hexId{ font-size: calc(var(--hexWMain) * 0.28); }
  .mark{ width: 14px; height: 14px; font-size: 8px; }
}
`;function R0(e,t){var o;const r=e==null?void 0:e.transitionsByFromId;if(r!=null&&r.get){const a=r.get(t);if(a!=null&&a.to)return{type:a.type==="DOWN"?"DOWN":"UP",to:{layer:Number(a.to.layer),row:Number(a.to.row),col:Number(a.to.col)}}}const n=(o=e==null?void 0:e.scenario)==null?void 0:o.transitions;if(!n)return null;const l=tt(t);if(!l)return null;for(const a of n){const i=a==null?void 0:a.from;if(!i)continue;const s=Number(i.layer),c=Number(i.row),h=Number(i.col);if(!Number.isFinite(s)||!Number.isFinite(c)||!Number.isFinite(h)||s!==l.layer||c!==l.row||h!==l.col)continue;const v=(a==null?void 0:a.type)==="DOWN"?"DOWN":"UP",g=(a==null?void 0:a.to)??{},w=Number(g.layer),E=Number(g.row),x=Number(g.col);return{type:v,to:{layer:Number.isFinite(w)?w:v==="UP"?l.layer+1:l.layer-1,row:Number.isFinite(E)?E:l.row,col:Number.isFinite(x)?x:l.col}}}return null}function T0(e){const t=Array.isArray(e==null?void 0:e.villains)&&e.villains||Array.isArray(e==null?void 0:e.villainTriggers)&&e.villainTriggers||Array.isArray(e==null?void 0:e.encounters)&&e.encounters||Array.isArray(e==null?void 0:e.triggers)&&e.triggers||[],r=["bad1","bad2","bad3","bad4"],n=[],l=a=>a>=1&&a<=7?a-1:a,o=a=>a>=1&&a<=7?a-1:a;for(const a of t){if(!a||typeof a!="object")continue;const i=a.from&&typeof a.from=="object"?a.from:a,s=String(a.key??a.villainKey??a.id??i.key??"bad1"),c=r.includes(s)?s:"bad1",h=Number(i.layer??i.L??a.layer??a.L??1);let v=Number(i.row??i.r??a.row??a.r??0);v=l(v);let g;const w=i.cols??i.col??i.c??a.cols??a.col??a.c;w==="any"?g="any":Array.isArray(w)?g=w.map(E=>o(Number(E))).filter(E=>Number.isFinite(E)):Number.isFinite(Number(w))&&(g=[o(Number(w))]),!(!Number.isFinite(h)||!Number.isFinite(v))&&n.push({key:c,layer:h,row:v,cols:g})}return n}function P0(){const[e,t]=b.useState("start"),[r,n]=b.useState([]),[l,o]=b.useState(null),a=b.useRef(null),i=!!l,[s,c]=b.useState([]),[h,v]=b.useState(null),g=b.useMemo(()=>s.find(p=>p.id===h)??null,[s,h]),[w,E]=b.useState(null),x=b.useMemo(()=>(g==null?void 0:g.scenarios.find(p=>p.id===w))??null,[g,w]),[j,f]=b.useState(null),d=b.useMemo(()=>{const p=x==null?void 0:x.tracks;return!p||p.length<=0?null:p.find(C=>C.id===j)??null},[x,j]);b.useEffect(()=>{c(S0())},[]);const[m,k]=b.useState(null),[y,I]=b.useState(null),[P,R]=b.useState(0),[F,M]=b.useState(1),[me,It]=b.useState(1),tr=F>1,Kn=F<me,[So,Rt]=b.useState(null),[Jr,_]=b.useState(null),[D,O]=b.useState(!1),[J,ie]=b.useState(()=>typeof window<"u"?window.matchMedia("(max-width: 980px)").matches:!1);b.useEffect(()=>{const p=window.matchMedia("(max-width: 980px)"),C=()=>ie(p.matches);return p.addEventListener("change",C),()=>p.removeEventListener("change",C)},[]);const yr=b.useRef(null),qe=b.useRef(null),Zr=b.useRef(null),Le=b.useRef({cosmic:null,risk:null,terrain:null,shadow:null}),Tt=b.useRef(!1),[Ue,Eo]=b.useState(null),xr=b.useRef(null),Jn=b.useCallback(p=>{xr.current&&window.clearTimeout(xr.current);const C=Date.now();Eo({key:C,layer:p}),xr.current=window.setTimeout(()=>{Eo(null),xr.current=null},3e3)},[]);b.useEffect(()=>()=>{xr.current&&window.clearTimeout(xr.current)},[]);const pf=b.useMemo(()=>Ue?{"--layerFxColor":fn(Ue.layer)}:{},[Ue]),mt=b.useMemo(()=>{const p=y==null?void 0:y.playerHexId;return typeof p=="string"?p:null},[y,P]),Co=b.useMemo(()=>mt?tt(mt):null,[mt]),We=(Co==null?void 0:Co.layer)??null,No=b.useCallback(()=>{o(null),a.current=null,n([]),k(null),v(null),E(null),f(null),I(null),mf(R),M(1),It(1),Rt(null),_(null),Zn(0),ss(null),us(null),qr(null),qn.current=0,Lo([]),Oo([{id:"reroll",name:"Reroll",icon:"🎲",charges:2},{id:"revealRing",name:"Reveal",icon:"👁️",charges:2},{id:"peek",name:"Peek",icon:"🧿",charges:1}]),Eo(null),O(!1),t("start")},[]);function mf(p){p(C=>C+1)}const bo=b.useCallback(p=>{const C=tt(p);if(!C)return null;for(const N of r)if(N.layer===C.layer&&N.row===C.row&&(N.cols==="any"||!N.cols||Array.isArray(N.cols)&&N.cols.includes(C.col)))return N.key;return null},[r]),_o=b.useMemo(()=>Array.from({length:le.length},(p,C)=>C),[]);function gf(p){const C=p.layer;return u.createElement("div",{className:"ghostGrid","aria-hidden":"true"},_o.map(N=>{const T=le[N]??0;return u.createElement("div",{key:"ghost-row-"+C+"-"+N,className:"ghostRow"},Array.from({length:T},(z,A)=>u.createElement("div",{key:"g-"+C+"-"+N+"-"+A,className:"ghostSlot",style:Zu(N,A)},u.createElement("div",{className:"ghostHex"}))))}))}function is(p){var T,z;const C=p.side,N=p.currentLayer;if(C==="top"){const A=[1,2,3,4,5,6,7],B=gt?((T=tt(gt))==null?void 0:T.layer)??null:null,$=mt?((z=tt(mt))==null?void 0:z.layer)??null:null,V=se=>`${(se-.5)/7*100}%`;return u.createElement("div",{className:"barWrap barTop"},u.createElement("div",{className:"layerBar layerBarHorizontal"},A.map(se=>{const Se=se===N;return u.createElement("div",{key:se,className:"barSeg"+(Se?" isActive":""),"data-layer":se})}),$&&$>=1&&$<=7?u.createElement("div",{className:"barPlayerMini",style:{left:V($)}},u.createElement("div",{className:"miniSprite",style:{"--spriteImg":"url("+xs()+")","--frameW":vs,"--frameH":ys,"--cols":Po,"--rows":hs,"--frameX":ws,"--frameY":ks(gs)}})):null,B&&B>=1&&B<=7?u.createElement("div",{className:"goalMarker",style:{left:V(B)}},"G"):null))}return u.createElement("div",{className:"barWrap barLeft"},u.createElement("div",{className:"layerBar rowShiftBar"},_o.map(A=>{const B=y?i0(y,N,A):"";return u.createElement("div",{key:"rowSeg-"+A,className:"barSeg rowSeg"},B?u.createElement("span",{className:"rowShiftLabel"},B):null)})))}function hf(p){const C={"--cardGlow":p.glowVar};return u.createElement("div",{className:"hexDeckOverlay",style:C},u.createElement("div",{className:"hexDeckCol left"},u.createElement("div",{className:"hexDeckCard cosmic",ref:N=>Le.current.cosmic=N},u.createElement("div",{className:"deckFx"})),u.createElement("div",{className:"hexDeckCard risk",ref:N=>Le.current.risk=N},u.createElement("div",{className:"deckFx"}))),u.createElement("div",{className:"hexDeckCol right"},u.createElement("div",{className:"hexDeckCard terrain",ref:N=>Le.current.terrain=N},u.createElement("div",{className:"deckFx"})),u.createElement("div",{className:"hexDeckCard shadow",ref:N=>Le.current.shadow=N},u.createElement("div",{className:"deckFx"}))))}function vf(p){const C={"--cardGlow":p.glowVar},N=["cosmic","risk","terrain","shadow"];return u.createElement("div",{className:"mobileDeckRow",style:C},N.map(T=>u.createElement("div",{key:T,className:"mobileDeckCard hexDeckCard "+T,ref:z=>Le.current[T]=z},u.createElement("div",{className:"deckFx"}))))}const[yf,Zn]=b.useState(0),[gt,ss]=b.useState(null),[xf,us]=b.useState(null),[wf,qr]=b.useState(null),rr=b.useCallback(p=>p?p0(p):null,[]),[kf,Lo]=b.useState([]),qn=b.useRef(0),U=b.useCallback((p,C="info")=>{qn.current+=1;const N={n:qn.current,t:N0(),msg:p,kind:C};Lo(T=>[N,...T].slice(0,24))},[]),Sf=b.useMemo(()=>{const p=new Set;if(!y||!mt||We!==F)return p;for(const C of _n(y,mt)){const N=vn(y,C),T=Ju(N);!T.missing&&!T.blocked&&p.add(C)}return p},[y,mt,We,F]),oe=(x==null?void 0:x.theme)??null,cs=(oe==null?void 0:oe.palette)??null,ds=(oe==null?void 0:oe.assets.backgroundGame)??"",fs=(oe&&oe.assets&&oe.assets.backgroundLayers||{})["L"+F]||"",Ef=(oe==null?void 0:oe.assets.diceFacesBase)??"images/dice",el=(oe==null?void 0:oe.assets.diceCornerBorder)??"",Cf=(oe==null?void 0:oe.assets.villainsBase)??"images/villains",ps=(oe==null?void 0:oe.assets.hexTile)??"",Io=b.useMemo(()=>{const p=cs;return{"--L1":(p==null?void 0:p.L1)??"#19ffb4","--L2":(p==null?void 0:p.L2)??"#67a5ff","--L3":(p==null?void 0:p.L3)??"#ffd36a","--L4":(p==null?void 0:p.L4)??"#ff7ad1","--L5":(p==null?void 0:p.L5)??"#a1ff5a","--L6":(p==null?void 0:p.L6)??"#a58bff","--L7":(p==null?void 0:p.L7)??"#ff5d7a"}},[cs]);function $e(p){return ut(Ef+"/D20_"+p+".png")}function ms(p){return ut(Cf+"/"+p+".png")}function Ve(){return u.createElement(u.Fragment,null,u.createElement("span",{className:"diceCorner tl"}),u.createElement("span",{className:"diceCorner tr"}),u.createElement("span",{className:"diceCorner bl"}),u.createElement("span",{className:"diceCorner br"}))}const[gs,Ro]=b.useState("down"),[To,tl]=b.useState(!1),Po=4,hs=5,vs=128,ys=128;function xs(){return ut("images/players/sprite_sheet_20.png")}const en=b.useRef(null),zo=b.useRef(0),[ws,Nf]=b.useState(0),bf=10,_f=4;b.useEffect(()=>{const C=1e3/(To?bf:_f);zo.current=performance.now();const N=T=>{T-zo.current>=C&&(Nf(z=>(z+1)%Po),zo.current=T),en.current=requestAnimationFrame(N)};return en.current=requestAnimationFrame(N),()=>{en.current&&cancelAnimationFrame(en.current),en.current=null}},[To]);const Pt=b.useRef(null);b.useEffect(()=>()=>{Pt.current&&window.clearTimeout(Pt.current)},[]);function ks(p){return p==="down"?0:p==="left"?1:p==="right"?2:3}const Ss={x:-28,y:-36},[tn,Es]=b.useState(2),[Fe,Cs]=b.useState(!1),[rl,Fo]=b.useState(Ss),Do=b.useRef(null),Ns=b.useRef(2);b.useEffect(()=>()=>{Do.current&&window.clearTimeout(Do.current)},[]);function bs(p){switch(p){case 1:return{x:-90,y:0};case 2:return{x:0,y:0};case 3:return{x:0,y:-90};case 4:return{x:0,y:90};case 5:return{x:0,y:180};case 6:return{x:90,y:0};default:return{x:0,y:0}}}const nl=b.useCallback(()=>{if(Fe)return;Cs(!0);const p=performance.now(),C=650,N=()=>{const T=performance.now()-p,z=1+Math.floor(Math.random()*6);if(Es(z),Fo(bs(z)),T<C)Do.current=window.setTimeout(N,55);else{const A=1+Math.floor(Math.random()*6);Ns.current=A,Es(A),Fo(bs(A)),Cs(!1)}};N()},[Fe]),ht=b.useCallback((p,C)=>{for(let N=0;N<le.length;N++){const T=le[N]??7;for(let z=0;z<T;z++)cr(p,"L"+C+"-R"+N+"-C"+z)}},[]),ll=b.useCallback((p,C)=>{cr(p,C);let N=[];try{N=_n(p,C)}catch{try{N=_n(C)}catch{N=[]}}for(const T of N)cr(p,T)},[]),[Mo,Oo]=b.useState([{id:"reroll",name:"Reroll",icon:"🎲",charges:2},{id:"revealRing",name:"Reveal",icon:"👁️",charges:2},{id:"peek",name:"Peek",icon:"🧿",charges:1}]),Lf=b.useCallback(p=>{const C=Mo.find(T=>T.id===p);if(!C||C.charges<=0)return;if(Oo(T=>T.map(z=>z.id===p?{...z,charges:Math.max(0,z.charges-1)}:z)),p==="reroll"){nl(),U("Reroll used — rolling…","info");return}if(!y)return;const N=y.playerHexId??null;if(N){if(p==="revealRing"){ll(y,N),R(T=>T+1),U("Used: Reveal (ring)","ok");return}if(p==="peek"){const T=Math.min(me,F+1),z=Math.max(1,F-1),A=N.replace(/^L\d+-/,"L"+T+"-"),B=N.replace(/^L\d+-/,"L"+z+"-");ll(y,A),ll(y,B),R($=>$+1),U("Used: Peek (above/below ring)","info");return}}},[Mo,nl,U,y,ll,me,F]),_s=b.useRef(!1);b.useEffect(()=>{const p=_s.current;if(_s.current=Fe,!!l&&!Fe&&p)try{if(o(X=>X&&{...X,tries:X.tries+1}),Ns.current!==6)return;const N=a.current;if(!N){U("Encounter cleared — risk event passed.","ok"),o(null);return}if(!y){U("Encounter error: game state missing.","bad");return}const T=vn(y,N);if(!T||T.missing||T.blocked){U("Encounter target is invalid now — click another tile.","bad"),a.current=null;return}const z=y.playerHexId,A=Qu(y,N);if(dn(A.state),!A.ok){I(A.state),R(yt=>yt+1);const X=A.reason==="BLOCKED"?"Move failed after rolling a 6 — blocked tile wasted the turn.":"Move failed after rolling a 6 — click another tile and roll again.";U(X,"bad"),a.current=null;return}const B=A.state,$=B.playerHexId,V=$;a.current=null,o(null),!!z&&$!==z&&(tl(!0),Pt.current&&window.clearTimeout(Pt.current),Pt.current=window.setTimeout(()=>tl(!1),420),Ro($u(y,z,$))),Zn(X=>X+1);const Se=tt($),re=(Se==null?void 0:Se.layer)??F;I(B),R(X=>X+1),Number.isFinite(re)&&(Ot(B,re),re!==F&&(M(re),ht(B,re))),qr(rr(B)),U("Encounter cleared — moved to "+$,"ok"),gt&&$===gt&&U("Goal reached!","ok")}catch(C){console.error("Encounter resolution crashed:",C),U("Encounter crashed: "+String((C==null?void 0:C.message)??C),"bad")}},[l,Fe,y,tn,F,gt,ht,rr,U]);const[Ls,If]=b.useState([]),[Ge,ol]=b.useState(null),vt=b.useRef(null),Bo=b.useCallback((p,C)=>{vt.current&&window.clearTimeout(vt.current);const N=Date.now(),T=(C==null?void 0:C.durMs)??1400,z=(C==null?void 0:C.mode)??"flash";ol({key:N,card:p,durMs:T,villainKey:C==null?void 0:C.villainKey,mode:z}),z!=="riskEncounter"&&(vt.current=window.setTimeout(()=>{ol(null),vt.current=null},T))},[]);b.useEffect(()=>()=>{vt.current&&window.clearTimeout(vt.current)},[]),b.useEffect(()=>{l||ol(p=>(p==null?void 0:p.mode)==="riskEncounter"?null:p)},[l]);const Ao=b.useCallback(p=>{const C=tt(p);if(!C)return null;for(const N of Ls)if(N.layer===C.layer&&N.row===C.row&&N.col===C.col)return N.card;return null},[Ls]),[zt,Is]=b.useState(null),Ho=b.useRef(null);b.useEffect(()=>()=>{Ho.current&&window.clearTimeout(Ho.current)},[]);const Rs=b.useCallback((p,C)=>{const N=(C==null?void 0:C.then)??"flip",T=()=>{if(N==="encounter"){const V=I0();a.current=null,o({villainKey:V,tries:0}),Fo(Ss),Bo("risk",{villainKey:V,mode:"riskEncounter"}),U("Risk triggered — encounter: "+V+" (roll a 6)","bad");return}Bo(p)},z=Le.current[p]??(typeof document<"u"?document.querySelector(".mobileDeckRow .mobileDeckCard."+p):null);if(!z){T();return}const A=z.getBoundingClientRect(),B=window.getComputedStyle(z).borderRadius||"10px",$=Date.now();Is({key:$,card:p,from:{x:A.left,y:A.top,w:A.width,h:A.height,borderRadius:B}}),Ho.current=window.setTimeout(T,520),window.setTimeout(()=>{Is(null)},1200)},[Bo,U]),Ts=b.useCallback(()=>{a.current=null,o(null),ol(null),vt.current&&(window.clearTimeout(vt.current),vt.current=null)},[]),jo=b.useCallback(async()=>{var yt;if(!x)return;const N=(x.tracks??[]).length>1?(d==null?void 0:d.scenarioJson)??x.scenarioJson:x.scenarioJson,T=await C0(N),z=L0(T);If(z),U("Card triggers loaded: "+z.length,"info");const A=T0(T);n(A),U("Villain triggers loaded: "+A.length,"info"),o(null),a.current=null,fi.current=T;const B=f0(T);B.scenario=T,dn(B);const $=Math.max(1,Number((T==null?void 0:T.layers)??1));It($);let V=B.playerHexId,se=V?((yt=tt(V))==null?void 0:yt.layer)??1:1;se=Math.max(1,Math.min($,se)),(!V||!/^L\d+-R\d+-C\d+$/.test(V))&&(V=_0(B,se),B.playerHexId=V);const Se=V?tt(V):null;Se&&(se=Math.max(1,Math.min($,Se.layer)));const re=b0(T,se);ss(re),Ot(B,se),ht(B,se),I(B),Rt(V),_(V),M(se),Ro("down"),Zn(0);const X=rr(B);us(X),qr(X),qn.current=0,Lo([]),U("Started: "+x.name,"ok"),V&&U("Start: "+V,"info"),re&&U("Goal: "+re,"info"),Oo([{id:"reroll",name:"Reroll",icon:"🎲",charges:2},{id:"revealRing",name:"Reveal",icon:"👁️",charges:2},{id:"peek",name:"Peek",icon:"🧿",charges:1}]),window.setTimeout(()=>{qe.current&&(qe.current.scrollLeft=0)},0),t("game")},[x,d,ht,rr,U]);b.useEffect(()=>{Tt.current&&x&&(Tt.current=!1,jo())},[x,jo]);const Ps=b.useCallback(p=>{var yt;if(!y||i)return;if(We&&F!==We){M(We),Ot(y,We),ht(y,We),R(Ee=>Ee+1),U("You were viewing layer "+F+" but the player is on layer "+We+" — switched back.","info");return}const C=vn(y,p);if(!C||C.missing){U("Missing tile.","bad");return}const N=y.playerHexId,T=bo(p);if(T){a.current=p,o(Ee=>Ee?{...Ee,villainKey:T}:{villainKey:T,tries:0}),U("Encounter: "+T+" — roll a 6 to continue","bad");return}const z=Qu(y,p);if(dn(z.state),!z.ok){I(z.state),R(Ee=>Ee+1),qr(rr(z.state)),z.reason==="BLOCKED"?U("Blocked tile — lost turn.","bad"):U("Invalid move.","bad");return}const A=z.state,B=A.playerHexId,$=B,V=(N?(yt=tt(N))==null?void 0:yt.layer:F)??F,se=B!==N;Zn(Ee=>Ee+1);const Se=tt($),re=(Se==null?void 0:Se.layer)??V;re&&V&&re!==V&&Jn(re),se&&(tl(!0),Pt.current&&window.clearTimeout(Pt.current),Pt.current=window.setTimeout(()=>tl(!1),420),Ro($u(y,N,B))),I(A),Rt($),R(Ee=>Ee+1),Ot(A,re),re!==F&&(M(re),ht(A,re));const X=Ao($);X&&(Rs(X,X==="risk"?{then:"encounter"}:void 0),U("Card triggered: "+X,X==="risk"?"bad":"info")),qr(rr(A)),U("Moved to "+$,"ok"),gt&&$===gt&&U("Goal reached!","ok")},[y,i,F,We,gt,U,ht,rr,bo,Jn,Ao,Rs]);return e==="start"?u.createElement("div",{className:"appRoot",style:Io},u.createElement("div",{className:"screen center"},u.createElement("div",{className:"panel"},u.createElement("div",{className:"title"},"Hex Game"),u.createElement("div",{className:"sub"},"Start → World → Character → Scenario → Game"),u.createElement("div",{className:"row"},u.createElement("button",{className:"btn primary",onClick:()=>t("world")},"Start"),u.createElement("button",{className:"btn",onClick:No},"Reset")),u.createElement("div",{className:"hint"},"Worlds loaded: ",u.createElement("b",null,s.length)))),u.createElement("style",null,va)):e!=="game"?u.createElement("div",{className:"appRoot",style:Io},u.createElement("div",{className:"screen center"},u.createElement("div",{className:"panel wide"},u.createElement("div",{className:"title"},"Choose your run"),u.createElement("div",{className:"sub"},"Pick a world, then a scenario, then (optionally) a track."),u.createElement("div",{className:"grid",style:{marginTop:14}},s.map(p=>{const C=p.id===h;return u.createElement("button",{key:p.id,className:"card "+(C?"active":""),onClick:()=>{v(p.id);const N=p.scenarios&&p.scenarios.length?p.scenarios[0]:null;E(N?N.id:null);const T=N&&N.tracks&&N.tracks.length?N.tracks[0]:null;f(T?T.id:null),t("scenario")}},u.createElement("div",{className:"cardTitle"},p.name),u.createElement("div",{className:"cardDesc"},p.desc??""))})),g?u.createElement("div",{style:{marginTop:16}},u.createElement("div",{className:"tracksTitle"},"Scenarios"),u.createElement("div",{className:"grid"},g.scenarios.map(p=>{const C=p.id===w;return u.createElement("button",{key:p.id,className:"card "+(C?"active":""),onClick:()=>{E(p.id);const N=p.tracks&&p.tracks.length?p.tracks[0]:null;f(N?N.id:null),t("scenario")}},u.createElement("div",{className:"cardTitle"},p.name),u.createElement("div",{className:"cardDesc"},p.desc??""))}))):null,x&&x.tracks&&x.tracks.length>1?u.createElement("div",{className:"tracks"},u.createElement("div",{className:"tracksTitle"},"Tracks"),u.createElement("div",{className:"tracksRow"},x.tracks.map(p=>{const C=p.id===j;return u.createElement("button",{key:p.id,className:"chip "+(C?"active":""),onClick:()=>f(p.id)},p.name)})),u.createElement("div",{className:"hint"},"Selected: ",u.createElement("b",null,d?d.name:"—"))):x?u.createElement("div",{className:"hint",style:{marginTop:12}},x.tracks&&x.tracks.length===1?"Only one track available.":"No tracks for this scenario (it will start normally)."):null,u.createElement("div",{className:"row"},u.createElement("button",{className:"btn",onClick:No},"Back"),u.createElement("button",{className:"btn primary",disabled:!x,onClick:jo},"Start"),u.createElement("button",{className:"btn",onClick:()=>{const p=s[0],C=p&&p.scenarios?p.scenarios[0]:null;if(p&&C){v(p.id),E(C.id);const N=C.tracks&&C.tracks.length?C.tracks[0]:null;f(N?N.id:null),Tt.current=!0}}},"Quick start (debug)")),u.createElement("div",{className:"hint",style:{marginTop:10}},"World: ",u.createElement("b",null,g?g.name:"—")," · Scenario: ",u.createElement("b",null,x?x.name:"—")))),u.createElement("style",null,va)):u.createElement("div",{className:"appRoot game",style:Io},u.createElement("div",{className:"gameBg",style:{backgroundImage:ds?"url("+ut(ds)+")":void 0}}),u.createElement("div",{className:"topbar"},u.createElement("div",{className:"items"},Mo.map(p=>u.createElement("button",{key:p.id,className:"itemBtn "+(p.charges<=0?"off":""),disabled:p.charges<=0||!y||i&&p.id!=="reroll"||Ue!==null,onClick:()=>Lf(p.id),title:p.name+" ("+p.charges+")"},u.createElement("span",{className:"itemIcon"},p.icon),u.createElement("span",{className:"itemName"},p.name),u.createElement("span",{className:"itemCharges"},p.charges)))),u.createElement("button",{className:"btn",disabled:!y||Ue!==null,onClick:()=>O(p=>!p)},D?"Hide Ghost":"Show Ghost"),u.createElement("button",{className:"btn",disabled:!y||!tr||i||Ue!==null,onClick:()=>{if(!y)return;const p=Math.max(1,F-1),C=dn(y);M(p),Ot(C,p),ht(C,p),R(N=>N+1),U("Layer "+p,"info"),Jn(p)}},"− Layer"),u.createElement("button",{className:"btn",disabled:!y||!Kn||i||Ue!==null,onClick:()=>{if(!y)return;const p=Math.min(me,F+1),C=dn(y);M(p),Ot(C,p),ht(C,p),R(N=>N+1),U("Layer "+p,"info"),Jn(p)}},"+ Layer"),u.createElement("div",{className:"spacer"}),u.createElement("button",{className:"btn",onClick:No},"Reset")),u.createElement("div",{className:"gameLayout"},u.createElement("div",{className:"playColumn"},u.createElement("div",{className:"boardWrap"},u.createElement(is,{side:"top",currentLayer:F}),u.createElement(is,{side:"left",currentLayer:F}),u.createElement("div",{key:F,className:"boardLayerBg",style:{backgroundImage:fs?"url("+ut(fs)+")":void 0}}),J?null:u.createElement(hf,{glowVar:fn(F)}),u.createElement("div",{className:"boardScroll",ref:qe},u.createElement("div",{className:"board",ref:yr},u.createElement("div",{className:"hexGrid"},D?u.createElement(gf,{layer:F}):null,Ue?u.createElement("div",{key:Ue.key,className:"layerFxOverlay",style:pf,"aria-live":"polite"},u.createElement("div",{className:"layerFxCard"},u.createElement("div",{className:"layerFxTitle"},"Layer ",Ue.layer))):null,_o.map(p=>{const C=le[p]??0;return u.createElement("div",{key:"row-"+p,className:"hexRow"},Array.from({length:C},(N,T)=>{var Fs;const z=y?cf(y,F,p,T):null,A=Zu(p,T);if(!z)return u.createElement("div",{key:"empty-"+p+"-"+T,className:"hexSlot empty",style:A});const B=R0(y,z),$=(B==null?void 0:B.type)==="UP",V=(B==null?void 0:B.type)==="DOWN",se=((Fs=B==null?void 0:B.to)==null?void 0:Fs.layer)??null,Se=se?fn(se):null,re=vn(y,z),X=Ju(re);if(X.missing)return u.createElement("div",{key:z,className:"hexSlot empty",style:A});const yt=So===z,Ee=mt===z,Uo=Jr===z,Rf=We===F&&!Ee&&Sf.has(z),Wo=Ao(z),$o=gt===z,zs=!!bo(z),Tf=y0({revealed:!!(re!=null&&re.revealed),blocked:X.blocked,isGoal:$o,isStart:Uo,isPortalUp:$,isPortalDown:V}),Pf={"--tileArt":`url(${ut(ps||x0(Tf))})`};return u.createElement("div",{key:"v-"+p+"-"+T,className:"hexSlot",style:A},u.createElement("button",{ref:Ee?Zr:void 0,className:["hex",yt?"sel":"",Rf?"reach":"",X.blocked?"blocked":"",Ee?"player":"",$o?"goal":"",zs?"trigger":"",Uo?"portalStart":"",$?"portalUp":"",V?"portalDown":""].join(" "),onClick:()=>{if(Ue===null){if(We&&F!==We){Ps(z);return}Rt(z),Ps(z)}},disabled:!y||X.blocked||X.missing||i||Ue!==null,style:{"--hexGlow":fn(F),...Se?{"--portalC":Se}:{}},title:z},u.createElement("div",{className:"hexAnchor"},u.createElement("div",{className:"hexInner",style:Pf},u.createElement("div",{className:"hexCoords"},u.createElement("div",{className:"hexId"},p+","+T)),$||V?u.createElement("div",{className:"portalFx"},u.createElement("div",{className:"pAura"}),u.createElement("div",{className:"pOrbs"}),u.createElement("div",{className:"pRim"}),u.createElement("div",{className:"pOval"})):null,Uo?u.createElement("div",{className:"portalFx"},u.createElement("div",{className:"pAura"}),u.createElement("div",{className:"pRunes"}),u.createElement("div",{className:"pVortex"}),u.createElement("div",{className:"pWell"}),u.createElement("div",{className:"pShine"})):null,u.createElement("div",{className:"hexMarks"},$?u.createElement("span",{className:"mark"},"↑"):null,V?u.createElement("span",{className:"mark"},"↓"):null,$o?u.createElement("span",{className:"mark g"},"G"):null,zs?u.createElement("span",{className:"mark t"},"!"):null)))),Wo?u.createElement("div",{className:"cardBadge hexDeckCard "+Wo,title:Wo},u.createElement("div",{className:"deckFx"})):null,Ee?u.createElement("span",{className:"playerSpriteSheet "+(To?"walking":""),style:{"--spriteImg":"url("+xs()+")","--frameW":vs,"--frameH":ys,"--cols":Po,"--rows":hs,"--frameX":ws,"--frameY":ks(gs)}}):null)}))}))))),J?u.createElement(vf,{glowVar:fn(F)}):null,u.createElement("div",{className:"side"},u.createElement("div",{className:"panelMini statusPanel"},u.createElement("div",{className:"miniTitle"},"Status"),u.createElement("div",{className:"statusGrid"},u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Layer"),u.createElement("span",{className:"v"},F,"/",me)),u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Moves"),u.createElement("span",{className:"v"},yf)),u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Optimal (start)"),u.createElement("span",{className:"v"},xf??"-")),u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Optimal (now)"),u.createElement("span",{className:"v"},wf??"-")))),u.createElement("div",{className:"panelMini logPanel"},u.createElement("div",{className:"miniTitle"},"Log"),u.createElement("div",{className:"log"},kf.map(p=>u.createElement("div",{key:p.n,className:"logRow "+(p.kind??"")},u.createElement("div",{className:"lt"},p.t),u.createElement("div",{className:"lm"},p.msg)))))))),zt?u.createElement("div",{className:"flyCardOverlay","aria-hidden":"true"},u.createElement("div",{key:zt.key,className:"flyCard hexDeckCard "+zt.card,style:{"--fromX":zt.from.x+"px","--fromY":zt.from.y+"px","--fromW":zt.from.w+"px","--fromH":zt.from.h+"px","--fromRadius":zt.from.borderRadius}},u.createElement("div",{className:"flyFace flyFront"},u.createElement("div",{className:"deckFx"})),u.createElement("div",{className:"flyFace flyBack"},u.createElement("div",{className:"deckFx"})))):null,Ge&&Ge.mode==="riskEncounter"&&l?u.createElement("div",{key:Ge.key,className:"cardFlipOverlay riskEncounter",role:"dialog","aria-modal":"true",style:{"--flipDur":Ge.durMs+"ms","--diceBorderUrl":el?"url("+ut(el)+")":"none"}},u.createElement("div",{className:"riskEncounterStack"},u.createElement("div",{className:"cardFlipCard risk riskReveal"},u.createElement("div",{className:"cardFlipFace front"},u.createElement("div",{className:"riskCardFx"})),u.createElement("div",{className:"cardFlipFace back"},u.createElement("img",{src:ms(l.villainKey),alt:l.villainKey}))),u.createElement("div",{className:"riskEncounterControls"},u.createElement("div",{className:"encounterActionRow"},u.createElement("div",{className:"dice3d diceLg "+(Fe?"rolling":"")},u.createElement("div",{className:"cube",style:{transform:"rotateX("+rl.x+"deg) rotateY("+rl.y+"deg)"}},u.createElement("div",{className:"face face-front",style:{backgroundImage:"url("+$e(tn)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-back",style:{backgroundImage:"url("+$e(5)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-right",style:{backgroundImage:"url("+$e(3)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-left",style:{backgroundImage:"url("+$e(4)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-top",style:{backgroundImage:"url("+$e(1)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-bottom",style:{backgroundImage:"url("+$e(6)+")"}},u.createElement(Ve,null)))),u.createElement("div",{className:"encounterInfo"},u.createElement("div",{className:"encounterTitle"},"ENCOUNTER!"),u.createElement("div",{className:"encounterSub"},"Roll a ",u.createElement("b",null,"6")," to continue",u.createElement("span",{className:"encounterTries"},"Tries: ",u.createElement("b",null,l.tries))),u.createElement("div",{className:"encounterButtons"},u.createElement("button",{className:"btn primary",disabled:Fe,onClick:nl},Fe?"Rolling…":"Roll"),u.createElement("button",{className:"btn",disabled:Fe,onClick:()=>{Ts(),U("Encounter dismissed (debug)","info")}},"Dismiss")),u.createElement("div",{className:"encounterRollPill"},"Roll = ",u.createElement("b",null,tn))))))):Ge?u.createElement("div",{key:Ge.key,className:"cardFlipOverlay","aria-hidden":"true",style:{"--flipDur":Ge.durMs+"ms"}},u.createElement("div",{className:"cardFlipCard "+Ge.card},u.createElement("div",{className:"cardFlipLabel"},Ge.card))):null,l&&(Ge==null?void 0:Ge.mode)!=="riskEncounter"?u.createElement("div",{className:"encounterScene",role:"dialog","aria-modal":"true",style:{"--diceBorderUrl":el?"url("+ut(el)+")":"none"}},u.createElement("div",{className:"encounterGrid"},u.createElement("div",{className:"encounterCard riskCard"},u.createElement("div",{className:"riskCardFx"}),u.createElement("img",{className:"riskVillainImg",src:ms(l.villainKey),alt:l.villainKey})),u.createElement("div",{className:"encounterRight"},u.createElement("div",{className:"encounterActionRow"},u.createElement("div",{className:"dice3d diceLg "+(Fe?"rolling":"")},u.createElement("div",{className:"cube",style:{transform:"rotateX("+rl.x+"deg) rotateY("+rl.y+"deg)"}},u.createElement("div",{className:"face face-front",style:{backgroundImage:"url("+$e(tn)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-back",style:{backgroundImage:"url("+$e(5)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-right",style:{backgroundImage:"url("+$e(3)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-left",style:{backgroundImage:"url("+$e(4)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-top",style:{backgroundImage:"url("+$e(1)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-bottom",style:{backgroundImage:"url("+$e(6)+")"}},u.createElement(Ve,null)))),u.createElement("div",{className:"encounterInfo"},u.createElement("div",{className:"encounterTitle"},"ENCOUNTER!"),u.createElement("div",{className:"encounterSub"},"Roll a ",u.createElement("b",null,"6")," to continue",u.createElement("span",{className:"encounterTries"},"Tries: ",u.createElement("b",null,l.tries))),u.createElement("div",{className:"encounterButtons"},u.createElement("button",{className:"btn primary",disabled:Fe,onClick:nl},Fe?"Rolling…":"Roll"),u.createElement("button",{className:"btn",disabled:Fe,onClick:()=>{Ts(),U("Encounter dismissed (debug)","info")}},"Dismiss")),u.createElement("div",{className:"encounterRollPill"},"Roll = ",u.createElement("b",null,tn))))))):null,u.createElement("style",null,va))}const ff=document.getElementById("app");if(!ff)throw new Error("Missing #app element");ya.createRoot(ff).render(u.createElement(u.StrictMode,null,u.createElement(P0,null)));
