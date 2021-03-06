angular.module('app', ['ngResource', 'ngSanitize', 'common.directives.offer'])
    .controller('AppController', ['$scope', 'appLogic', '$window', function ($scope, appLogic, $window) {
        $scope.offers = appLogic.getOffers();
        $scope.filters = {};

        $scope.isLoading = function () {
            return $scope.offers.$resolved === false;
        };

        $scope.getAveragePay = function () {
            var sum = 0;
            for (var i = 0; i < $scope.offers.length; i++) {
                sum += parseFloat($scope.offers[i].pay);
            }
            return sum / $scope.offers.length;
        };

        $scope.getAveragePayPerHour = function () {
            var sum = 0;
            for (var i = 0; i < $scope.offers.length; i++) {
                sum += (parseFloat($scope.offers[i].pay) / (parseFloat($scope.offers[i].hours) * 4 * 5));
            }
            return sum / $scope.offers.length;
        };

        $scope.getFilteredOffers = function () {
            return appLogic.getFilteredOffers($scope.offers, $scope.filters);
        };

        $scope.getSavedOffers = function () {
            return appLogic.getSavedOffers($scope.offers);
        };

        $scope.clearFilters = function () {
            $scope.filters = {};
        };

        $scope.goTop = function () {
            $window.scrollTo(0, 0);
        }

        $window.addEventListener('scroll', function () {
            $scope.$apply(function () {
                $scope.pageYOffset = $window.pageYOffset;
            });
        });

    }])
    .factory('appLogic', ['$resource', '$window', '$location', function ($resource, $window, $location) {


        var source = 'http://localhost/peix/backend/get.php'; //Develop
        //var source = $location.protocol() + "://" + $location.host() + "/api/get.php"; //Production

        var Offer = $resource(source);

        //Se cargan los códigos de las ofertas que el usuario ha guardado.
        var saved = [];
        if ($window.localStorage.getItem('saved')) {
            saved = $window.localStorage.getItem('saved').split(',');
        }

        //Función auxiliar para los filtros.
        function unset(attr) {
            return attr === undefined || attr === null || attr === "";
        }

        var api = {
            getOffers: function () {
                var offers = Offer.query();
                var now = (new Date()).getTime();

                //Marcar como guardados aquellos que el usuario ha guardado.
                offers.$promise.then(function (data) {
                    for (var i = 0; i < data.length; i++) {

                        data[i].start = api.adjustFromServer(api.newDate(data[i].start));
                        data[i].publicationDate = api.adjustFromServer(api.newDate(data[i].publicationDate));
                        data[i].expired = now > data[i].start.getTime();

                        for (var j = 0; j < saved.length; j++) {
                            if (data[i].code == saved[j]) {
                                data[i].saved = true;
                                break;
                            }
                        }
                    }

                    //data = data.reverse();

                    return data;

                });

                return offers;

            },

            getFilteredOffers: function (offers, filters) {
                var fOffers = [];
                for (var i = 0; i < offers.length; i++) {
                    var offer = offers[i];
                    var matching = filters.minPay === undefined || parseInt(offer.pay) >= filters.minPay;
                    matching = matching && (unset(filters.minMonths) || parseInt(offer.duration) >= filters.minMonths);
                    matching = matching && (unset(filters.maxMonths) || parseInt(offer.duration) <= filters.maxMonths);
                    matching = matching && (unset(filters.minHours) || parseInt(offer.hours) >= filters.minHours);
                    matching = matching && (unset(filters.maxHours) || parseInt(offer.hours) <= filters.maxHours);
                    matching = matching && (unset(filters.hideExpired) || filters.hideExpired === false || filters.hideExpired === true && offer.expired === false);
                    if (matching) {
                        fOffers.push(offer);
                    }


                }

                return fOffers;
            },

            getSavedOffers: function (offers) {
                var sOffers = [];
                for (var i = 0; i < offers.length; i++) {
                    var offer = offers[i];
                    if (offer.saved) {
                        sOffers.push(offer);
                    }
                }
                return sOffers;
            },

            newDate: function (ymdDate) {
                if (ymdDate === null || ymdDate === undefined) return null;

                var d = ymdDate.split("-");
                var date = new Date(d[0], d[1] - 1, d[2]);
                date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
                return date;
            },

            adjustFromServer: function (date) {
                if (date) {
                    date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
                }
                return date;
            }

        };

        return api;

    }]);