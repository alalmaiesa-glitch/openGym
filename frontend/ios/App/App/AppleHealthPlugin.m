#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AppleHealthPlugin, "AppleHealth",
           CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(readChanges, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(commitAnchors, CAPPluginReturnPromise);
)
