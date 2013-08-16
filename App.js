Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.logger(),
    _base_records: [],
    items: [{
        xtype:'container',
        itemId:'selector_box',
        padding:5,
        layout:{type:'hbox'},
        defaults: { margin: 5 }
    },
    {
        xtype:'container',
        itemId:'pi_title',
        padding: 5
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
                height: 500,
                padding: 10
            },
            {
                xtype:'container',
                itemId:'target_chart_box',
                width: 600, 
                height: 500,
                padding: 10
            }
        ]
    }],
    launch: function() {
        this._addSelectors();
    },
    _addSelectors: function() {
        this._addIterationPicker();
        this._addTypePicker();
        this._addButtons();
    },
    _addTypePicker: function() {
        this.down('#selector_box').add({
            itemId: 'type_selector',
            xtype: 'rallyportfolioitemtypecombobox',
            fieldLabel: 'Portfolio Items of Type:',
            labelWidth: 150
        });
    },
    _addIterationPicker: function() {
        var first_time = true;
        var me = this;
        this.down('#selector_box').add({
            xtype: 'rallyiterationcombobox',
            itemId: 'iteration_selector',
            fieldLabel: 'Items from Iteration:',
            width:300,
            allowNoEntry:true
        });
    },
    _addButtons: function() {
        var me = this;
        this.down('#selector_box').add({
            xtype:'rallybutton',
            text:'Choose a Portfolio Item',
            handler: me._launchPIPicker,
            scope: me
        });
        this.down('#selector_box').add({
            xtype:'rallybutton',
            text:'Draw Chart',
            handler: me._processChoices,
            scope: me
        });
    },
    _processChoices: function() {
        var me = this;
        var message_box = this.down('#pi_title');
        if ( this.actual_chart ) { this.actual_chart.destroy(); }
        
        message_box.removeAll();
        message_box.add({xtype:'container',html:'Selection options:'});
        this.logger.log(this,this.down('#type_selector').getRecord());
        var options = {
            pi: this.down('#type_selector').getRecord().get('ElementName'),
            iteration: this.down('#iteration_selector').getRecord()
        };
        if ( this._base_records.length > 0 ) {
            options.pi = this._base_records[0];
        }
        
        this.logger.log(this,typeof options.pi);
        if ( typeof options.pi === 'object' ) {
            message_box.add({xtype:'container',html:'Descendants of ' + options.pi.get('Name')});
        } else {
            message_box.add({xtype:'container',html:'Descendants of Portfolio Items of type ' + options.pi});
        }
        
        if ( options.iteration.get('Name')) {
            message_box.add({xtype:'container',html:'Assigned to iteration ' + options.iteration.get('Name')});
        }
        if (typeof options.pi === 'object'){
            this._findDescendants(options, this._base_records);
        } else {
            Ext.create('Rally.data.WsapiDataStore',{
                model:this.down('#type_selector').getRecord().get('TypePath'),
                fetch: ['Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID'],
                autoLoad: true,
                listeners: {
                    load: function(store,records) {
                        me._findDescendants(options,records);
                    }
                }
            });
        }
    },
    _launchPIPicker: function() {
        var me = this;
        this.logger.log(this, "launch PI Picker");
        
        this._base_records = [];
        
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
                    me._base_records = records;
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
    _findDescendants: function(options,records){
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
                                    me._findDescendants(options,all_children);
                                }
                            }
                        });
                    }
                });
                if (no_children_found) { me._findDescendants(options,[]); }
            } else {
                // get children stories
                me.logger.log(this,"going to get stories");
                var oid_filters = Ext.create('Rally.data.QueryFilter',{property:type_name+".ObjectID",operator:'=',value:records[0].get('ObjectID')});
                Ext.Array.each(records,function(record,idx){
                    if (idx>0) {
                        oid_filters = oid_filters.or(Ext.create('Rally.data.QueryFilter',{
                            property:type_name+".ObjectID",
                            operator:'=',
                            value:record.get('ObjectID')
                        }));
                    }
                });
                var filters = Ext.create('Rally.data.QueryFilter',{property:"PlanEstimate",operator:'>',value:0});
                filters = filters.and(Ext.create('Rally.data.QueryFilter',{property:"DirectChildrenCount",operator:'=',value:0}));
                if ( options.iteration ) {
                    filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                        property:'Iteration.Name',
                        value: options.iteration.get('Name')
                    }));
                }
                
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
                                me.down('#pi_title').add({xtype:'container',html:'<br/><br/>No stories for given selection options'});
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
        var chart_data = {};
        var total_size = 0;
        Ext.Array.each(stories,function(story){
            me.logger.log(this,story.get('Name'));
            var state = story.get('ScheduleState');
            me.logger.log(this,state);
            var size = story.get('PlanEstimate');
            
            if ( !chart_data[state] ) {
                chart_data[state] = 0;
            }
            chart_data[state] += size;
            total_size += size;
        });

        var series = [];
        for ( var state in chart_data ) {
            var ratio = parseInt(100*chart_data[state]/total_size);
            var name = state + " " + ratio + "%";
            series.push({name:name,y:chart_data[state]});
        }
        
        me.logger.log(this,["Chart Data",chart_data]);
        me.logger.log(this,["Chart Series",series]);

        if ( me.actual_chart ) { me.actual_chart.destroy(); }
        
        me.actual_chart = this.down('#actual_chart_box').add({
            xtype:'rallychart',

            chartConfig: {
                chart: {},
                height: 350,
                width: 350,
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
                tooltip: { enabled: false},
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
});
