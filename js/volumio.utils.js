var AjaxUtils = {
	get : function(action, data, callback, error, nestedCaller) {
		var caller = arguments.callee.caller.name.toString();

		this.ajax(action, "GET", data, callback, error, caller, nestedCaller);
	},
	post : function(action, data, callback, error, nestedCaller) {
		var caller = arguments.callee.caller.name.toString();

		this.ajax(action, "POST", data, callback, error, caller, nestedCaller);
	},
	ajax: function(action, method, data, callback, error, caller, nestedCaller) {
		var debugText = "STARTING " + method + " request " + action + " from func " + caller;
		if (nestedCaller) {
			debugText += " via func " + nestedCaller;
		}

		console.debug(debugText + " with data=");
		console.log(data);
	    $.ajax({
	        type : method,
	        url : action,
	        dataType: "json",
			data: data,
	        async : true,
	        cache : false,
	        success : function(data) {
	            console.debug("FINISHED " + method + " request " + action + " from func " + caller + " with response =");
	            console.log(data);
	            if (typeof callback === "function") {
	            	callback(data);
	            }
	        },
	        error : function(a, b, c) {
	            console.error("FAILED " + method + " request " + action + " from func " + caller);
	            console.error(c);
	            if (typeof error === "function") {
	            	error(a, b, c);
	            }
	        }
	    });
	}

};