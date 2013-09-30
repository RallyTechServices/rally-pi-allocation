Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.logger(),
    _selected_base_records: [],
    _direct_children: [],
    _selected_iteration: null,
    _selected_tags: [],
    items: [
    {
        xtype:'container',
        itemId:'selector_box',
        padding:5,
        layout:{type:'hbox'},
        defaults: { margin: 5 },
        items: [
            {xtype:'container',itemId:'pi_selector_box'},
            {xtype:'container',itemId:'chart_selector_box'},
            {xtype:'container',items:[
                {xtype:'container',itemId:'iteration_selector_box'},
                {xtype:'container',itemId:'tag_selector_box'},
                {xtype:'container',itemId:'metric_selector_box'}
            ]}
        ]
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
                itemId:'selected_metric_box'
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
        
        this._addIterationDatePickers();
        this._addTagPicker();

        this._addMetricPicker();
        this._addChartButton();
    },
    _addTagPicker: function() {
        var me = this;
        this.down('#tag_selector_box').add({
            itemId:'tag_selector',
            xtype: 'rallytagpicker',
            fieldLabel: 'with tag(s)',
            autoExpand: false,
            listeners: {
                selectionchange: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addTypePicker: function() {
        var me = this;
        this.down('#pi_selector_box').add({
            itemId: 'type_selector',
            xtype: 'rallyportfolioitemtypecombobox',
            fieldLabel: 'PI Type:',
            storeConfig: {
                filters: [{"property":"Ordinal","operator":">","value":0}]
            },
            labelWidth: 50,
            listeners: {
                change: function() {
                    me._selected_base_records = [];
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addMetricPicker: function() {
        var me = this;
        var metrics = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data : [
                {"name":"By Points", "value":"points"},
                {"name":"By Count", "value":"count"},
                {"name":"By Hours", "value":"hours"}
            ]
        });
        this.down('#chart_selector_box').add({
            itemId: 'metric_selector',
            xtype: 'combobox',
            fieldLabel: 'Chart metric:',
            store: metrics,
            displayField: 'name',
            valueField:'value',
            labelWidth: 50,
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        }).setValue('points');
    },
    _addIterationDatePickers: function() {
        var me = this;
        this.down('#iteration_selector_box').add({
            itemId:'iteration_start_selector',
            xtype:'rallydatefield',
            fieldLabel:'Iterations starting after',
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
        this.down('#iteration_selector_box').add({
            itemId:'iteration_end_selector',
            xtype:'rallydatefield',
            fieldLabel:'Iterations ending before',
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addIterationPicker: function() {
        var me = this;
        this.down('#iteration_selector_box').add({
            xtype: 'rallyiterationcombobox',
            itemId: 'iteration_selector',
            fieldLabel: 'From iteration:',
            labelWidth:50,
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
        this.down('#pi_selector_box').add({
            xtype:'rallybutton',
            text:'Choose a Portfolio Item',
            handler: me._launchPIPicker,
            scope: me
        });
    },
    _addChartButton: function(){
        var me = this;
        this.down('#chart_selector_box').add({
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
            iteration_start: Rally.util.DateTime.format(me.down('#iteration_start_selector').getValue(), 'Y-MM-dd'),
            iteration_end: Rally.util.DateTime.format(me.down('#iteration_end_selector').getValue(), 'Y-MM-dd'),
            tags: this._selected_tags
        };

        me.logger.log(this,"options",options);
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
        
        var metric_message = "Display by " + me.down('#metric_selector').getValue();
        
        //me._selected_iteration = me.down('#iteration_selector').getRecord();
        
        var iteration_message = "&nbsp;&nbsp;&nbsp;Items regardless of iteration";
        if ( me._selected_iteration && me._selected_iteration.get('Name') !== "" ) {
            iteration_message = "&nbsp;&nbsp;&nbsp;Items associated with iterations named " + me._selected_iteration.get('Name');
        }
        
        var iteration_start_date = Rally.util.DateTime.format(me.down('#iteration_start_selector').getValue(), 'D, M d, Y');
        var iteration_end_date = Rally.util.DateTime.format(me.down('#iteration_end_selector').getValue(), 'D, M d, Y');
        if ( iteration_start_date  && iteration_end_date ) {
            iteration_message =  "&nbsp;&nbsp;&nbsp;Items associated with iterations starting after " +
                    iteration_start_date + " and ending before " + iteration_end_date;
        } else if ( iteration_start_date ) {
            iteration_message =  "&nbsp;&nbsp;&nbsp;Items associated with iterations starting after " + iteration_start_date;
        } else if ( iteration_end_date ) {
            iteration_message =  "&nbsp;&nbsp;&nbsp;Items associated with iterations ending before " + iteration_end_date;
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
            me.down('#selected_metric_box').update(metric_message);
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
        var filters = Ext.create('Rally.data.QueryFilter',{property:"DirectChildrenCount",operator:'=',value:0});
        filters = filters.and(Ext.create('Rally.data.QueryFilter',{property:'ScheduleState',operator:'>',value:'Defined'}));
        
        if ( options.iteration && options.iteration.get('Name') !== "") {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property:'Iteration.Name',
                value: options.iteration.get('Name')
            }));
        }
        
        if ( options.iteration_start ) {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property: 'Iteration.StartDate',
                operator: ">=",
                value: options.iteration_start
            }));
        }
        
        if ( options.iteration_end ) {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property: 'Iteration.EndDate',
                operator: "<=",
                value: options.iteration_end
            }));
        }
        
        filters = filters.and(oid_filters);
        
        me.logger.log(this,"filters",filters.toString());
        Ext.create('Rally.data.WsapiDataStore',{
            model:'UserStory',
            filters: filters,
            fetch: ['Name','PlanEstimate','ScheduleState','TaskEstimateTotal'],
            autoLoad: true,
            listeners: {
                load: function(store,records) {
                    me.logger.log(this,"Stories for " + key,records);
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
                        me._makeBarChart();
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
    // given an array of direct children, return a hash where the 
    // key is the direct child name
    // and value is the size (depending on metric chosen) for that item
    _calculateDataForChart: function(direct_children) {
        var me = this;
        me.logger.log(this,"_calculateDataForChart");
        var chart_data = {};
        var metric = this.down('#metric_selector').getValue();
        Ext.Object.each(direct_children,function(key,child){
            var data_key = child.get('Name');
            chart_data[data_key] = 0;
            var leaves = child.get('_leaves');
            Ext.Array.each(leaves,function(leaf){
                var size = leaf.get('PlanEstimate')||0;
                if ( metric === 'count' ) {
                    size = 1;
                } else if ( metric === 'hours' ) {
                    size = leaf.get('TaskEstimateTotal') || 0;
                }
                chart_data[data_key] += size;
                
            });
        });
        return chart_data;
    },
    _makeBarChart: function() {
        var me = this;
        me.logger.log(this,"_makeBarChart");
        var chart_data = {};
        
        var chart_data = me._calculateDataForChart(me._direct_children);
        if ( me.actual_chart ) { me.actual_chart.destroy(); }
        
        if ( Ext.Object.getKeys(chart_data).length === 0 ) {
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'container',
                html:'No points found'
            });
        } else {
            var series = [];
            var categories = [];
            Ext.Array.each(this._selected_base_records, function(chosen_record){
                categories.push(chosen_record.get('Name'));
            });
            Ext.Object.each(chart_data,function(key,value){
                var name = Ext.util.Format.ellipsis(key,28,true);
                series.push({type:'column',name:name,data:[value], stack: 1});
            });
            
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'rallychart',
                chartData: {
                    series: series,
                    categories: categories
                },
                chartConfig: {
                    chart: {},
                    title: {
                        text: '',
                        align: 'center'
                    },
                    xAxis: [{categories:categories}],
                    plotOptions: {
                        column: {
                            stacking: 'normal'
                        }
                    },
                    yAxis: [{title:{text:''}}]
                }
            });
        }
    },
    _makePieChart: function(){
        var me = this;
        me.logger.log(this,"_makePieChart");
        var total_size = 0;
        
        var chart_data = me._calculateDataForChart(me._direct_children);
 
        // get total size
        Ext.Object.each(chart_data,function(key,value){
            total_size += value;
        });
        
        var series = [];
        Ext.Object.each(chart_data,function(key,value){
            var ratio = parseInt(100*value/total_size);
            var name = Ext.util.Format.ellipsis(key,28,true) + "<br/>" + ratio + "%";
            series.push({full_name:key,name:name,y:value});
        });
        
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
                                distance: 5,
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
