/*
 */
Ext.define('Rally.technicalservices.logger',{
    constructor: function(config){
        Ext.apply(this,config);
    },
    log: function(src_class,message){
        var class_name = "";
        if ( typeof(src_class) === "string" ) {
            class_name = src_class;
        } else if ( typeof src_class.getName === "function") { 
            class_name = src_class.getName();
        } else if (typeof src_class.self.getName === 'function'){
            class_name = src_class.self.getName();
        }
        window.console && console.log(class_name,"--",message);
    }

});