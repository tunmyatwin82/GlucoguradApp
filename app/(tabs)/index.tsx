import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Chip, List, Text, TextInput } from 'react-native-paper';
import { db } from '../../firebaseConfig';

export default function App() {
  const [glucose, setGlucose] = useState('');
  const [logs, setLogs] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  // ၁။ Database မှ ဒေတာများ ရယူခြင်း
  useEffect(() => {
    const q = query(collection(db, "glucoseLogs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    });
    return () => unsubscribe();
  }, []);

  // ၂။ သွေးချိုအခြေအနေ ခွဲခြားခြင်း Logic
  const getStatus = (level) => {
    const val = parseInt(level);
    if (val < 70) return { label: 'နည်းသည်', color: '#2196F3' };
    if (val <= 140) return { label: 'ပုံမှန်', color: '#4CAF50' };
    if (val <= 200) return { label: 'များသည်။', color: '#FF9800' };
    return { label: 'အလွန်များသည်။', color: '#F44336' };
  };

  // ၃။ ဒေတာသိမ်းခြင်း (ရွေးချယ်ထားသော Date/Time ဖြင့်)
  const saveLog = async () => {
    if (!glucose) return Alert.alert("သွေးချိုပမာဏ ထည့်ပါ");
    await addDoc(collection(db, "glucoseLogs"), {
      level: parseInt(glucose),
      timestamp: date.getTime(),
      dateString: date.toLocaleDateString(),
      timeString: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: getStatus(glucose).label
    });
    setGlucose('');
    Alert.alert("အောင်မြင်သည်", "မှတ်တမ်းသိမ်းပြီးပါပြီ");
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: '#6200ee' }}>
        <Appbar.Content title="GlycoGuard Pro" color="white" />
        <Chip 
          onPress={() => setPaymentModal(true)} 
          style={{ backgroundColor: isPremium ? '#4CAF50' : '#FFC107', marginRight: 10 }}
        >
          {isPremium ? "Premium User" : "Upgrade Plan"}
        </Chip>
      </Appbar.Header>

      <ScrollView style={{ padding: 15 }}>
        {/* မှတ်တမ်းသွင်းရန် Form */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="သွေးချိုပမာဏ (mg/dL)"
              value={glucose}
              onChangeText={setGlucose}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <Button mode="outlined" onPress={() => setShowPicker(true)} icon="calendar">
              အချိန်ရွေးရန်: {date.toLocaleString()}
            </Button>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="datetime"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
            <Button mode="contained" onPress={saveLog} style={{ marginTop: 15 }}>
              မှတ်တမ်းသိမ်းမည်
            </Button>
          </Card.Content>
        </Card>

        {/* ခြုံငုံသုံးသပ်ချက် (Daily/Monthly Summary) - Premium Feature */}
        <Card style={[styles.card, { marginTop: 20, backgroundColor: isPremium ? '#fff' : '#f0f0f0' }]}>
          <Card.Content>
            <Text variant="titleMedium">📊 ခြုံငုံသုံးသပ်ချက်</Text>
            {isPremium ? (
              <View style={{ marginTop: 10 }}>
                <Text>ယနေ့ပျမ်းမျှ: 125 mg/dL (ပုံမှန်)</Text>
                <Text>ယခုလအတွင်း အတက်အကျ: +/- 10%</Text>
              </View>
            ) : (
              <Text style={{ color: 'grey', fontSize: 12 }}>Premium ဝယ်ယူပြီး နေ့အလိုက်၊ လအလိုက် ဒေတာများကို ကြည့်ပါ။</Text>
            )}
          </Card.Content>
        </Card>

        {/* ယခင်မှတ်တမ်းများ */}
        <Text style={{ marginTop: 25, fontWeight: 'bold' }}>ယခင်မှတ်တမ်းများ</Text>
        {logs.map((item) => {
          const status = getStatus(item.level);
          return (
            <List.Item
              key={item.id}
              title={`${item.level} mg/dL (${status.label})`}
              description={`${item.dateString} | ${item.timeString}`}
              left={props => <List.Icon {...props} icon="water" color={status.color} />}
              style={styles.listItem}
            />
          );
        })}
      </ScrollView>

      {/* Payment Modal (QR Codes) */}
      <Modal visible={paymentModal} onDismiss={() => setPaymentModal(false)} contentContainerStyle={styles.modal}>
        <View style={styles.modalContent}>
          <Text variant="headlineSmall" style={{ marginBottom: 15 }}>Premium အဆင့်မြှင့်ရန်</Text>
          <Text style={{ marginBottom: 20 }}>အောက်ပါ QR တစ်ခုခုကို Scan ဖတ်၍ ၅,၀၀၀ ကျပ် လွှဲပေးပါ။ ပြီးလျှင် Screenshot ပေးပို့ပါ။</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.qrContainer}><Text>KBZPay QR</Text></View>
            <View style={styles.qrContainer}><Text>WavePay QR</Text></View>
            <View style={styles.qrContainer}><Text>CBPay QR</Text></View>
          </ScrollView>
          <Button mode="contained" onPress={() => { setIsPremium(true); setPaymentModal(false); }} style={{ marginTop: 20 }}>
            ငွေလွှဲပြီးပြီ (Confirm)
          </Button>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { elevation: 2, borderRadius: 12, backgroundColor: 'white' },
  listItem: { backgroundColor: 'white', marginTop: 5, borderRadius: 8, elevation: 1 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 15 },
  modalContent: { alignItems: 'center' },
  qrContainer: { width: 150, height: 150, backgroundColor: '#eee', margin: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }
});