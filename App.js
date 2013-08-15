Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.logger(),
    items: [{
        xtype:'container',
        itemId:'selector_box',
        padding:5,
        layout:{type:'hbox'},
        defaults: { padding: 5 }
    },
    {
        xtype:'container',
        itemId:'pi_title',
        padding: 5
    }],
    launch: function() {
        this._addSelectors();
    },
    _addSelectors: function() {
        this._addTypePicker();
        this._addButton();
    },
    _addTypePicker: function() {
        this.down('#selector_box').add({
            itemId: 'type_selector',
            xtype: 'rallyportfolioitemtypecombobox'
        });
    },
    _addButton: function() {
        var me = this;
        this.down('#selector_box').add({
            xtype:'rallybutton',
            text:'Choose Portfolio Item',
            handler: me._launchPIPicker,
            scope: me
        });
    },
    _launchPIPicker: function() {
        var me = this;
        this.logger.log(this, "launch PI Picker");
        this.down('#pi_title').removeAll();
        this.down('#pi_title').html = '';
        
        this.dialog = Ext.create('Rally.ui.dialog.ChooserDialog', {
            artifactTypes: [me.down('#type_selector').getRecord().get('TypePath')],
            filterableFields: [
                {displayName: 'ID', attributeName:"FormattedID"},
                {displayName: 'Name', attributeName:"Name"}
            ],
            columns: [
                {text:'id',dataIndex:'FormattedID'},
                {text:'Name',dataIndex:'Name',flex: 1},
                {text:'State',dataIndex:'State'}
            ],
            storeConfig: {
                fetch:['Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID']
            },
            autoShow: true,
            height: 400,
            title: 'Choose a PI',
            multiple: false,
            buttons: [{
                xtype:'rallybutton',
                text:'Select',
                userAction:'clicked done in dialog',
                handler:function(){
                    var records = me.dialog._getSelectedRecords();
                    me._findDescendants(records);
                    if ( records.length === 0 ) {
                        this.down('#pi_title').update('No Portfolio Item chosen');
                    } else {
                        var first_record = records[0];
                        this.down('#pi_title').update('Portfolio Item: ' + first_record.get('FormattedID') + ":" + first_record.get('Name'));
                    }
                    me.dialog.close();
                },
                scope: me
            },
            {
                xtype:'rallybutton',
                text:'Cancel',
                userAction:'clicked done in dialog',
                handler:function(){
                    me.dialog.close();
                },
                scope: me
            }]
         });
    },
    _findDescendants: function(records){
        var me = this;
        me.logger.log(this,['_findDescendants for ',records]);
        var type_name = null;
        
        if ( records.length === 0 ) {
            me.down('#pi_title').add({xtype:'container',html:'No path to stories for'});
        } else {
            var first_record = records[0];

            var pi_level = first_record.get('PortfolioItemType').Ordinal;
            type_name = first_record.get('PortfolioItemType').Name;
            // 0 is lowest level (e.g., feature)
            me.logger.log(this,'pi level ' + pi_level);
            if ( pi_level !== 0 ) {
                // get children PIs
                var all_children = [];
                var callback_counter = 0;
                var no_children_found = true;
                Ext.Array.each(records, function(record){
                    var children = record.get('Children');
                    if ( children.Count > 0 ) {
                        callback_counter += 1;
                        no_children_found = false;
                        record.getCollection('Children',{fetch:['Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID']}).load({
                            callback: function(records,operation,success){
                                Ext.Array.push(all_children,records);
                                callback_counter -= 1;
                                me.logger.log(this,'counter ' + callback_counter);
                                if (callback_counter<=0) {
                                    me._findDescendants(all_children);
                                }
                            }
                        });
                    }
                });
                if (no_children_found) { me._findDescendants([]); }
            } else {
                // get children stories
                me.logger.log(this,"going to get stories");
                var oid_filters = Ext.create('Rally.data.QueryFilter',{property:type_name+".ObjectID",operator:'=',value:records[0].get('ObjectID')});
                Ext.Array.each(records,function(record,idx){
                    if (idx>0) {
                        oid_filters = oid_filters.or(Ext.create('Rally.data.QueryFilter',{
                            property:type_name+".ObjectID",
                            operator:'=',
                            value:records[0].get('ObjectID')
                        }));
                    }
                });
                var filters = Ext.create('Rally.data.QueryFilter',{property:"PlanEstimate",operator:'>',value:0});
                filters = filters.and(Ext.create('Rally.data.QueryFilter',{property:"DirectChildrenCount",operator:'=',value:0}));
                
                filters = filters.and(oid_filters);
                me.logger.log(this,["filters",filters.toString()]);
                Ext.create('Rally.data.WsapiDataStore',{
                    model:'UserStory',
                    filters: filters,
                    fetch: ['Name','PlanEstimate','ScheduleState'],
                    autoLoad: true,
                    listeners: {
                        load: function(store,records) {
                            me.logger.log(this,records);
                            if ( records.length === 0 ) {
                                me.down('#pi_title').add({xtype:'container',html:'No stories for'});
                            } else { 
                                me._makeChart(records);
                            }
                        }
                    }
                });
            }
        }
    },
    _makeChart: function(stories){
        var me = this;
        Ext.Array.each(stories,function(story){
            me.logger.log(this,story.get('Name'));
        });
    }
});
