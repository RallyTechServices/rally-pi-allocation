rally-pi-allocation
===================

This app displays a chart of stacked columns.  You can choose one or more portfolio items (PIs) to
display on the chart; each PI gets its own column.  The series shown as stacks on the column are
calculated by the metric you choose: points, count, hours or cost.  The stacks are either aggregations
of the metric by child (count/add up the leaf node children associated with each next level down
PI) or by category (count/add up the values associated with each value in the category field).  

Only stories that are in a state greater than "Defined" are counted.

When cost is used as the metric, the found task hours (by estimate) are multiplied by the entered
cost multiplier and shown with a dollar sign.

In addition, the stories used to make the calculations can be further limited by iteration start
and end dates as well as tags.

To use the 'category' metric, you *must* create and define a custom field of drop-down type and 
put that name into the code as the category_field_name property.  The default is "c_Category". 
(Remember that with the new API, custom fields start are prepended by a "c_".
