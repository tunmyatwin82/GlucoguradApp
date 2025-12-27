import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { Appbar, Button, Card, List, Text, TextInput } from 'react-native-paper';
import { db } from '../../firebaseConfig';

export default function App() {
  const [glucose, setGlucose] = useState('');
  const [logs, setLogs] = useState([]);
  const [isPremium, setIsPremium] = useState(false); // Premium အခြေအနေ

  // ၁။ Database မှ ဒေတာများ အချိန်နှင့်တပြေးညီ ရယူခြင်း
  useEffect(() => {
    const q = query(collection(db, "glucoseLogs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    });
    return () => unsubscribe();
  }, []);

  // ၂။ သွေးချိုမှတ်တမ်း အသစ်သွင်းခြင်း
  const saveLog = async () => {
    if (!glucose || isNaN(glucose)) {
      Alert.alert("သတိပေးချက်", "ဂဏန်းအမှန်အတိုင်း ရိုက်ထည့်ပါ");
      return;
    }
    await addDoc(collection(db, "glucoseLogs"), {
      level: parseInt(glucose),
      createdAt: serverTimestamp(),
      dateString: new Date().toLocaleDateString()
    });
    setGlucose('');
    Alert.alert("အောင်မြင်သည်", "မှတ်တမ်းသိမ်းဆည်းပြီးပါပြီ");
  };

  // ၃။ PDF Report ထုတ်ယူခြင်း (Premium Only)
  const generatePDF = async () => {
    if (!isPremium) {
      Alert.alert("Premium ဝယ်ယူရန်", "PDF ထုတ်ယူရန်အတွက် Premium Plan ဝယ်ယူရန် လိုအပ်ပါသည်။");
      return;
    }

    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="text-align: center;">GlycoGuard ဆီးချိုမှတ်တမ်း</h1>
          <table border="1" style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 10px;">နေ့စွဲ</th>
              <th style="padding: 10px;">သွေးချိုပမာဏ (mg/dL)</th>
            </tr>
            ${logs.map(l => `<tr><td style="padding: 10px;">${l.dateString}</td><td style="padding: 10px;">${l.level}</td></tr>`).join('')}
          </table>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#6200ee' }}>
        <Appbar.Content title="GlycoGuard MVP" color="white" />
        <Button mode="text" color="white" onPress={() => setIsPremium(!isPremium)}>
          {isPremium ? "PREMIUM" : "FREE"}
        </Button>
      </Appbar.Header>

      <ScrollView style={{ padding: 15 }}>
        {/* မှတ်တမ်းသွင်းရန် Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 10 }}>သွေးချိုအသစ်ထည့်ရန်</Text>
            <TextInput
              label="mg/dL"
              value={glucose}
              onChangeText={setGlucose}
              keyboardType="numeric"
              mode="outlined"
            />
            <Button mode="contained" onPress={saveLog} style={{ marginTop: 15 }}>
              မှတ်တမ်းသိမ်းမည်
            </Button>
          </Card.Content>
        </Card>

        {/* Graph ပြသရန် */}
        {logs.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text variant="titleMedium">သွေးချိုအတက်အကျ ဇယား</Text>
            <LineChart
              data={{
                labels: logs.slice(0, 5).reverse().map(l => l.dateString.split('/')[1]),
                datasets: [{ data: logs.slice(0, 5).reverse().map(l => l.level) }]
              }}
              width={Dimensions.get("window").width - 30}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 10, marginTop: 10 }}
            />
          </View>
        )}

        {/* PDF ထုတ်ရန် ခလုတ် */}
        <Button 
          icon="file-pdf-box" 
          mode="outlined" 
          onPress={generatePDF} 
          style={{ marginTop: 20, borderColor: isPremium ? 'green' : '#ccc' }}
        >
          PDF Report ထုတ်ယူမည် {isPremium ? "" : "(Premium)"}
        </Button>

        {/* ယခင်မှတ်တမ်းများစာရင်း */}
        <Text style={{ marginTop: 30, marginBottom: 10 }} variant="titleMedium">ယခင်မှတ်တမ်းများ</Text>
        {logs.map((item) => (
          <List.Item
            key={item.id}
            title={`${item.level} mg/dL`}
            description={item.dateString}
            left={props => <List.Icon {...props} icon="water" color={item.level > 140 ? "red" : "green"} />}
            style={{ backgroundColor: '#f9f9f9', marginBottom: 5, borderRadius: 5 }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const chartConfig = {
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
  strokeWidth: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: { elevation: 4, borderRadius: 10 },
});