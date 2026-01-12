import React from "react";
import { Platform, KeyboardAvoidingView, View } from "react-native";

const KeyboardAvoidingAnimatedView = React.forwardRef((props, ref) => {
  const {
    children,
    behavior = Platform.OS === "ios" ? "padding" : "height",
    keyboardVerticalOffset = 0,
    style,
    enabled = true,
    ...restProps
  } = props;

  if (!enabled) {
    return <>{children}</>;
  }

  // For web, just use a simple View wrapper
  if (Platform.OS === "web") {
    return (
      <View ref={ref} style={style} {...restProps}>
        {children}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      ref={ref}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}
      enabled={enabled}
      {...restProps}
    >
      {children}
    </KeyboardAvoidingView>
  );
});

KeyboardAvoidingAnimatedView.displayName = "KeyboardAvoidingAnimatedView";

export default KeyboardAvoidingAnimatedView;
