'use strict';

/**
 * @ngdoc function
 * @name clientApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the clientApp
 */
angular.module('clientApp').controller('MainCtrl', function ($scope, $timeout, $http, $location, Constants) {
  $scope.authenticationManagerHealthy = true;
  $scope.tenantManagerHealthy = true;
  $scope.tenantRegistrationHealthy = true;
  $scope.orderManagerHealthy = true;
  $scope.productManagerHealthy = true;
  $scope.userManagerHealthy = true;
});
