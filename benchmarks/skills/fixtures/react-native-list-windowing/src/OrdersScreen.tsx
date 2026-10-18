import { Pressable, ScrollView, Text } from "react-native";

type Order = { id: string; title: string };
type Props = { orders: Order[]; onOpen: (id: string) => void };

export function OrdersScreen({ orders, onOpen }: Props) {
  return <ScrollView>{orders.map((order) => (
    <Pressable key={order.id} style={{ height: 56 }} onPress={() => onOpen(order.id)}>
      <Text>{order.title}</Text>
    </Pressable>
  ))}</ScrollView>;
}
