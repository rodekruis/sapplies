var sappliesApp = angular.module('sapplies', ['ngRoute', 'ngResource', 'ngAnimate', 'ui.bootstrap', 'facebook']);

sappliesApp.config(function($routeProvider, FacebookProvider) {
	$routeProvider
	.when('/login', {
		templateUrl: 'views/login.html',
		controller: 'LoginController'
	})
	.when('/overview', {
	  templateUrl: 'views/overview.html',
	  controller: 'OverviewController'
	})
	.when('/facebook-management', {
		templateUrl: 'views/fb-management.html',
		controller: 'FBManagementController'
	})
	.when('/needs/create', {
		templateUrl: 'views/needs-create.html',
		controller: 'NeedsController'
	})
	.when('/needs/:id', {
		templateUrl: 'views/need-detail.html',
		controller: 'NeedDetailController'
	})
	.when('/offers/:id', {
		templateUrl: 'views/offers-detail.html',
		controller: 'OffersDetailController'
	})
	.when('/matches', {
		templateUrl: 'views/matches.html',
		controller: 'MatchesController'
	})
	.otherwise({
	  redirectTo: '/overview'
	});

	// Init FacebookProvider with fb app id
	FacebookProvider.init('339468399539706');
});

sappliesApp.directive('animateOnChange', [ '$animate', function($animate) {
  return function(scope, elem, attr) {
		scope.$watch(attr.animateOnChange, function(nv,ov) {
			if (nv!=ov) {
				var cssClass = 'change';
				$animate.addClass(elem, cssClass, function() {
					$animate.removeClass(elem, cssClass);
				});
			}
		});
   };
}]);
