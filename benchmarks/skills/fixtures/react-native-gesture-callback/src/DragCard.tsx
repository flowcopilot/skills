import { useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export function DragCard() {
  const [dragCount, setDragCount] = useState(0);
  const pan = Gesture.Pan().onEnd(() => setDragCount((count) => count + 1));
  return <GestureDetector gesture={pan}><View><Text>Drag me</Text><Text>{dragCount}</Text></View></GestureDetector>;
}
