'use strict';

const mongoose = require('mongoose');

module.exports = {
    /**
     * Select query where comparison is done by unique columns and values.
     *
     * @collectionName {string} collectionName to select from
     * @returns {object} - JSON object
     */
    selectWithAnd: (collectionName, comparisonColumnsAndValues, columnsToSelect, sortColumnAndValues) => {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.find(comparisonColumnsAndValues, columnsToSelect, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                resolve(data);
                return
            }).sort(sortColumnAndValues);
        })
    },

    /**
    * Select query where comparison is done by unique columns and values and sorting by page.
    *
    * @collectionName {string} collectionName to select from
    * @returns {object} - JSON object
    */
    selectWithAndSort: (collectionName, comparisonColumnsAndValues, columnsToSelect, columnToSort) => {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.find(comparisonColumnsAndValues, columnsToSelect, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(data);
                return
            }).sort(columnToSort);
        })
    },

    /**
     * Count how many records in table and comparison is done by unique columns and values.
     *
     * @collectionName {string} collectionName to select from
     * @returns {object} - JSON object
     */

    countRecord: (collectionName, comparisonColumnsAndValues) => {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.count(comparisonColumnsAndValues, (error, rows) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                resolve(rows);
                return
            });
        })
    },

    /**
     * Select query where comparison is done by unique columns and values.
     *
     * @collectionName {string} collectionName to select from
     * @returns {object} - JSON object
     */
    selectWithAndOne: (collectionName, comparisonColumnsAndValues, columnsToSelect) => {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.findOne(comparisonColumnsAndValues, columnsToSelect, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                resolve(data);
                return
            });
        })
    },

    /**
     * Inserts single record
     *
     * @collectionName {string} collectionName to select from
     * @param {object} columnsAndValues Values and column
     *     to insert
     * @returns {object} - JSON object
     */
    insertSingle: (collectionName, columnsAndValues) => {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.create(columnsAndValues, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                resolve(data);
                return
            });
        })
    },

    /**
     * Updates a single record
     *
     * @collectionName {string}collectionName to update
     * @columnsToUpdate {Object}  Columns and values to update
     * @targetColumnsAndValues {Object} targetColumnsAndValues to identify the update record
     *
     * @returns {object} - JSON object
     */

    updateSingle: (collectionName, columnsToUpdate, targetColumnsAndValues)=> {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.update(targetColumnsAndValues, columnsToUpdate, { multi: true }, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                resolve(data);
                return
            });
        })
    },


    /**
     * Select query where comparison is done by unique columns and values and sorting by page.
     *
     * @collectionName {string} collectionName to select from
     * @returns {object} - JSON object
     */
    selectWithAndSortPaginate: function (collectionName, comparisonColumnsAndValues, columnsToSelect, sizePerPage, page, columnToSort) {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            page = parseInt(page);
            sizePerPage = parseInt(sizePerPage);
            dbCollection.find(comparisonColumnsAndValues, columnsToSelect, function (error, data) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(data);
                return
            }).sort(columnToSort).limit(sizePerPage).skip(sizePerPage * page);
        })
    },

    /**
       * Deletes a multiple record
       *
       * @collectionName {string}collectionName to update
       * @columnsToUpdate {Object}  Columns and values to update
       * @targetColumnsAndValues {Object} targetColumnsAndValues to identify the update record
       *
       * @returns {object} - JSON object 
    */

    removeMultiple: (collectionName, targetColumnsAndValues)=> {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.remove(targetColumnsAndValues, (error, data)=> {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(data);
                return
            });
        })
    },

    joinWithAnd: (collectionName, params)=> {
        return new Promise((resolve, reject) => {
            const dbCollection = mongoose.model(collectionName);
            dbCollection.aggregate(params).exec((error, data)=> {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(data);
                return
            });
        })
    },
};