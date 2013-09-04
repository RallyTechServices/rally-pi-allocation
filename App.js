Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.logger(),
    _selected_base_records: [],
    _direct_children: [],
    _selected_iteration: null,
    _selected_tags: [],
    items: [{
        xtype:'container',
        itemId:'selector_box',
        padding:5,
        layout:{type:'hbox'},
        defaults: { margin: 5 }
    },
    {
        xtype:'container',
        itemId:'configuration_reporter_box',
        defaults: { margin: 5 },
        padding: 5,
        items: [
            {
                xtype:'container',
                itemId:'selected_pi_box'
            },
            {
                xtype:'container',
                itemId:'selected_iteration_box'
            },
            {
                xtype:'container',
                itemId:'selected_tag_box'
            }
        ]
    },
    { 
        xtype:'container',
        layout: {type:'hbox'},
        margin: 5,
        items:[
            {
                xtype:'container',
                itemId:'actual_chart_box',
                width: 600, 
                height: 500
            },
            {
                xtype:'container',
                itemId:'target_chart_box',
                width: 600, 
                height: 500
            }
        ]
    }],
    launch: function() {
        this._addSelectors();
    },
    _addSelectors: function() {
        this._addTypePicker();
        this._addPIButton();
        
        this._addIterationPicker();
        this._addTagPicker();

        this._addChartButton();
    },
    _addTagPicker: function() {
        var me = this;
        this.down('#selector_box').add({
            itemId:'tag_selector',
            xtype: 'rallytagpicker',
            fieldLabel: 'with tag: ',
            autoExpand: false,
            labelWidth: 50,
            listeners: {
                selectionchange: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addTypePicker: function() {
        var me = this;
        this.down('#selector_box').add({
            itemId: 'type_selector',
            xtype: 'rallyportfolioitemtypecombobox',
            fieldLabel: 'Portfolio Item Type:',
            storeConfig: {
                filters: [{"property":"Ordinal","operator":">","value":0}]
            },
            labelWidth: 135,
            listeners: {
                change: function() {
                    me._selected_base_records = [];
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addIterationPicker: function() {
        var first_time = true;
        var me = this;
        this.down('#selector_box').add({
            xtype: 'rallyiterationcombobox',
            itemId: 'iteration_selector',
            fieldLabel: 'Limit to items from iteration:',
            width:300,
            allowNoEntry:true,
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addPIButton: function() {
        var me = this;
        this.down('#selector_box').add({
            xtype:'rallybutton',
            text:'Choose a Portfolio Item',
            handler: me._launchPIPicker,
            scope: me
        });
    },
    _addChartButton: function(){
        var me = this;
        this.down('#selector_box').add({
            itemId:'draw_chart_button',
            xtype:'rallybutton',
            text:'Draw Chart',
            disabled: true,
            handler: me._getData,
            scope: me
        });
    },
    _getData: function() {
        var me = this;
        if ( this.actual_chart ) { this.actual_chart.destroy(); }
        
        this.logger.log(this,"_getData",this.down('#type_selector').getRecord());
        var options = {
            pi: this._selected_base_records[0],
            iteration: this._selected_iteration,
            tags: this._selected_tags
        };

        me._direct_children = {};
        
        if ( options.pi.get('PortfolioItemType').Ordinal === 0 ) {
            // we have a feature level item, so do stories instead of children
            me.logger.log(this,"Not yet!");
        } else {
            options.pi.getCollection('Children',{
                fetch:['Tags','Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID']
            }).load({
                callback: function(records,operation,success){
                    if ( records.length === 0 ) {
                        me.actual_chart = me.down('#actual_chart_box').add({xtype:'container',html:'The selected item has no descendants'});
                    } else {
                        Ext.Array.each(records,function(record){
                            me._direct_children[record.get('FormattedID')] = record;
                            var key = record.get('FormattedID');
                            me._findDescendants(key,options,[record]);
                        });
                    }
                }
            });
        }
    },
    _populateConfigurationReporter: function() {
        var me = this;
        if ( this.actual_chart ) { this.actual_chart.destroy(); }
        
        me._selected_iteration = me.down('#iteration_selector').getRecord();
        var iteration_message = "&nbsp;&nbsp;&nbsp;Items regardless of iteration";
        if ( me._selected_iteration && me._selected_iteration.get('Name') !== "" ) {
            iteration_message = "&nbsp;&nbsp;&nbsp;Items associated with iterations named " + me._selected_iteration.get('Name');
        }
        
        me._selected_tags = [];
        Ext.Array.each(this.down('#tag_selector').getValue(),function(tag){
            me._selected_tags.push(tag.get('Name'));
        });
        var tag_message = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;and regardless of tag";
        if ( me._selected_tags.length === 1 ) {
            tag_message = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;and with tag named " + me._selected_tags[0];
        } else if ( me._selected_tags.length > 1 ) {
            tag_message = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;and with one of these tags: " + me._selected_tags.join(',');
        }
        
        if ( me._selected_base_records.length > 0 ) {
            me.down('#selected_pi_box').update("For " + 
                me.down('#type_selector').getRecord().get('ElementName') + " " +
                me._selected_base_records[0].get('FormattedID') + " " +
                me._selected_base_records[0].get('Name') + ", find:");
                
            me.down('#selected_iteration_box').update(iteration_message);
            me.down('#selected_tag_box').update(tag_message);
        } else {
            me.down('#selected_pi_box').update("No PI chosen.");
        }
        
    },
    _launchPIPicker: function() {
        var me = this;
        this.logger.log(this, "launch PI Picker");
        
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
                fetch:['Children','UserStories','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID','Tags']
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
                    me._selected_base_records = records;
                    if ( me._selected_base_records.length > 0 ) {
                        me.down('#draw_chart_button').setDisabled(false);
                    } else {
                        me.down('#draw_chart_button').setDisabled(true);
                    }
                    me._populateConfigurationReporter();
                    me.dialog.close();
                },
                scope: me
            },
            {
                xtype:'rallybutton',
                text:'Cancel',
                userAction:'clicked done in dialog',
                handler:function(){
                    if ( me._selected_base_records.length > 0 ) {
                        me.down('#draw_chart_button').setDisabled(false);
                    } else {
                        me.down('#draw_chart_button').setDisabled(true);
                    }
                    me._populateConfigurationReporter();
                    me.dialog.close();
                },
                scope: me
            }]
         });
    },
    _findDescendants: function(key,options,records){
        var me = this;
        me.logger.log(this,'_findDescendants for ',key,options,records);
        var type_name = null;
        
        if ( records.length === 0 ) {
            me.logger.log(this,"No path to stories",options);
            me._direct_children[key].set('_leaves',[]);
        } else {
            var first_record = records[0];
            var pi_level = first_record.get('PortfolioItemType').Ordinal;
            options.type_name = first_record.get('PortfolioItemType').Name;
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
                        record.getCollection('Children',{fetch:['Tags','Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID']}).load({
                            callback: function(records,operation,success){
                                Ext.Array.push(all_children,records);
                                callback_counter -= 1;
                                me.logger.log(this,'counter ' + callback_counter);
                                if (callback_counter<=0) {
                                    me._findDescendants(key,options,all_children);
                                }
                            }
                        });
                    }
                });
                if (no_children_found) { me._findDescendants(key,options,[]); }
            } else {
                // get children stories                
                me._limitPIsToSelectedTags(key,options,records);
            }
        }
    },
    _getStories: function(key,options,records){
        
        var field_name = "PortfolioItemRelease";
        if ( options.type_name !== "Release" ) {
            field_name = options.type_name;
        }
        var me = this;
        me.logger.log(this,"Getting stories related to " + key);
        var oid_filters = Ext.create('Rally.data.QueryFilter',{
            property:field_name+".ObjectID",
            operator:'=',
            value:records[0].get('ObjectID')
        });
        Ext.Array.each(records,function(record,idx){
            if (idx>0) {
                oid_filters = oid_filters.or(Ext.create('Rally.data.QueryFilter',{
                    property:field_name+".ObjectID",
                    operator:'=',
                    value:record.get('ObjectID')
                }));
            }
        });
        var filters = Ext.create('Rally.data.QueryFilter',{property:"PlanEstimate",operator:'>',value:0});
        filters = filters.and(Ext.create('Rally.data.QueryFilter',{property:"DirectChildrenCount",operator:'=',value:0}));
        filters = filters.and(Ext.create('Rally.data.QueryFilter',{property:'ScheduleState',operator:'>',value:'Defined'}));
        
        if ( options.iteration && options.iteration.get('Name') !== "") {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property:'Iteration.Name',
                value: options.iteration.get('Name')
            }));
        }
        
        filters = filters.and(oid_filters);
        
        me.logger.log(this,"filters",filters.toString());
        Ext.create('Rally.data.WsapiDataStore',{
            model:'UserStory',
            filters: filters,
            fetch: ['Name','PlanEstimate','ScheduleState'],
            autoLoad: true,
            listeners: {
                load: function(store,records) {
                    me.logger.log(this,"For " + key,records);
                    me._direct_children[key].set("_leaves",records);
                    var waiter = null;
                    for ( var i in me._direct_children ) {
                        if ( ! me._direct_children[i].get('_leaves') ) {
                            waiter = i;
                        }
                    }
                    me.logger.log(this,me._direct_children);
                    if ( waiter !== null ) {
                        me.logger.log(this,"Still waiting for " + waiter);
                    } else { 
                        me._makeChart();
                    }
                }
            }
        });
    },
    _limitPIsToSelectedTags: function(key,options,records){
        var me = this;
        me.logger.log(this,'_limitPIsToSelectedTags',key,options,records);
        var filtered_records = [];
        if ( options.tags.length === 0 ) {
            me._getStories(key,options,records);
        } else { 
            var callback_counter = 0;
            var any_tags_found = false;
            Ext.Array.each(records, function(record){
                var tags = record.get('Tags');
                me.logger.log(this,tags,record);
                if ( tags.Count > 0 ) {
                    any_tags_found = true;
                    callback_counter += 1;
                    record.getCollection('Tags',{fetch:['Name']}).load({
                        callback: function(tag_records,operation,success){
                            me.logger.log(this,"has tags",tag_records);
                            callback_counter -= 1;
                            me.logger.log(this,'counter ' + callback_counter);
                            Ext.Array.each(tag_records,function(tag_record) {
                                if (Ext.Array.indexOf(options.tags,tag_record.get('Name')) > -1) {
                                    filtered_records.push(record);
                                    return;
                                }
                            });
                            if (callback_counter<=0) {
                                if ( filtered_records.length === 0 ) {
                                    me.logger.log(this,"Has tags, but not the right ones, REMOVING",key);
                                    delete me._direct_children[key];
                                    //me._direct_children[key].set("_leaves",[]);
                                } else { 
                                     me._getStories(key,options,filtered_records);
                                }
                            }
                        }
                    });
                }
            });
            if ( !any_tags_found ) {
                me.logger.log(this,"Has no tags, so REMOVING",key);
                delete me._direct_children[key];
                //me._direct_children[key].set("_leaves",[]);
            }
        }
    },
    _makeChart: function(){
        var me = this;
        me.logger.log(this,"_makeChart");
        var chart_data = {};
        var total_size = 0;
        
        for ( var key in me._direct_children ) {
            var child = me._direct_children[key];
            me.logger.log(this,key,child);
            
            var data_key = child.get('FormattedID') + ":" + child.get('Name');
            chart_data[data_key] = 0;
            
            var leaves = child.get('_leaves');
            me.logger.log(this,leaves);
            
            Ext.Array.each(leaves,function(leaf){
                var size = leaf.get('PlanEstimate') || 0;
                chart_data[data_key] += size;
                total_size += size;
            });
        };

        var series = [];
        for ( var key in chart_data ) {
            var ratio = parseInt(100*chart_data[key]/total_size);
            var name = Ext.util.Format.ellipsis(key,28,true) + "<br/>" + ratio + "%";
            series.push({full_name:key,name:name,y:chart_data[key]});
        }
        
        me.logger.log(this,"Chart Data",chart_data);
        me.logger.log(this,"Chart Series",series);

        if ( me.actual_chart ) { me.actual_chart.destroy(); }
        
        if ( total_size === 0 ) {
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'container',
                html:'No points found'
            });
        } else {
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'rallychart',
                chartConfig: {
                    chart: {
                        spacingRight: 25,
                        spacingLeft: 5
                        /*width: 700*/
                    },
                    plotOptions: {
                        
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: true,
                                color: '#000000',
                                connectorColor: '#000000',
                                format: '<b>{point.name}</b>'
                            }
                        }
                    },
                    tooltip: { 
                        enabled: false
                    },
                    title: {
                        text: 'Actual Distribution',
                        align: 'center'
                    }
                },
                chartData: {
                    series: [{type:'pie',name:'State Distribution',data:series}]
                }
            });
        }
    }
});
