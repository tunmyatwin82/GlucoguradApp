import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { Appbar, Button, Card, Chip, List, RadioButton, Text, TextInput } from 'react-native-paper';
import { db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

// ၁။ TypeScript အတွက် Interface များ သတ်မှတ်ခြင်း
interface GlucoseLog {
  id: string;
  level: number;
  mealType: 'fasting' | 'afterMeal';
  status: string;
  timestamp: number;
  dateString: string;
  timeString: string;
}

interface ChartData {
  labels: string[];
  data: number[];
}

export default function App() {
  const [glucose, setGlucose] = useState<string>('');
  const [mealType, setMealType] = useState<'fasting' | 'afterMeal'>('fasting');
  const [logs, setLogs] = useState<GlucoseLog[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ labels: [], data: [] });
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<boolean>(false); // iOS အတွက်သာ
  const [paymentModal, setPaymentModal] = useState<boolean>(false);

  // ၂။ Real-time Database Sync
  useEffect(() => {
    const q = query(collection(db, "glucoseLogs"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GlucoseLog[];
      setLogs(data);

      if (data.length > 0) {
        const reversedData = [...data].reverse().slice(-5);
        setChartData({
          labels: reversedData.map(d => d.timeString),
          data: reversedData.map(d => d.level)
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // ၃။ Date Picker Logic (Android တွင် Date နှင့် Time ကို အဆင့်ဆင့်ရွေးရန်)
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    if (Platform.OS === 'ios') {
      setShowPicker(true);
    }
  };

  const showDateHandler = () => {
    if (Platform.OS === 'android') {
      // အဆင့် (၁) - Date ရွေးခြင်း
      DateTimePickerAndroid.open({
        value: date,
        onChange: (event, dDate) => {
          if (event.type === 'set' && dDate) {
            // အဆင့် (၂) - Date ရွေးပြီးလျှင် Time Picker ကို ထပ်ဖွင့်ခြင်း
            DateTimePickerAndroid.open({
              value: dDate,
              onChange: (tEvent, tDate) => {
                if (tEvent.type === 'set' && tDate) setDate(tDate);
              },
              mode: 'time',
              is24Hour: true,
            });
          }
        },
        mode: 'date',
      });
    } else {
      setShowPicker(true);
    }
  };

  // ၄။ Status Logic
  const getStatus = (level: number, type: string) => {
    if (type === 'fasting') {
      if (level < 70) return { label: 'နည်းသည် (Low)', color: '#2196F3' };
      if (level <= 130) return { label: 'ပုံမှန် (Target)', color: '#4CAF50' };
      return { label: 'များသည် (High)', color: '#F44336' };
    } else {
      if (level < 70) return { label: 'နည်းသည် (Low)', color: '#2196F3' };
      if (level <= 180) return { label: 'ပုံမှန် (Target)', color: '#4CAF50' };
      return { label: 'များသည် (High)', color: '#F44336' };
    }
  };

  // ၅။ Save Data
  const saveLog = async () => {
    const numLevel = parseInt(glucose);
    if (!glucose || isNaN(numLevel)) return Alert.alert("ဂဏန်းအမှန်အတိုင်း ထည့်ပါ");

    const statusInfo = getStatus(numLevel, mealType);
    try {
      await addDoc(collection(db, "glucoseLogs"), {
        level: numLevel,
        mealType: mealType,
        status: statusInfo.label,
        timestamp: date.getTime(),
        dateString: date.toLocaleDateString(),
        timeString: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setGlucose('');
      Alert.alert("အောင်မြင်သည်", "မှတ်တမ်းသိမ်းပြီးပါပြီ");
    } catch (e) {
      Alert.alert("Error", "ဒေတာသိမ်းဆည်း၍မရပါ");
    }
  };

  const handleSendToTelegram = () => {
    const url = `https://t.me/drtundmservice?text=${encodeURIComponent("GlycoGuard Premium အဆင့်မြှင့်ရန် ငွေလွှဲထားပါသည်။")}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Telegram ဖွင့်မရပါ"));
    setPaymentModal(false);
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
        {/* Input Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 10 }}>မှတ်တမ်းသစ်ထည့်ရန်</Text>
            <View style={styles.radioGroup}>
              <View style={styles.radioItem}>
                <RadioButton value="fasting" status={mealType === 'fasting' ? 'checked' : 'unchecked'} onPress={() => setMealType('fasting')} />
                <Text onPress={() => setMealType('fasting')}>အစာမစားခင်</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="afterMeal" status={mealType === 'afterMeal' ? 'checked' : 'unchecked'} onPress={() => setMealType('afterMeal')} />
                <Text onPress={() => setMealType('afterMeal')}>အစာစားပြီး</Text>
              </View>
            </View>

            <Text style={styles.referenceText}>
               ℹ️ {mealType === 'fasting' ? "Target: 70 - 130 mg/dL" : "Target: < 180 mg/dL"}
            </Text>

            <TextInput 
              label="သွေးချိုပမာဏ (mg/dL)" 
              value={glucose} 
              onChangeText={setGlucose} 
              keyboardType="numeric" 
              mode="outlined" 
              style={{ marginBottom: 15 }} 
            />

            <Button mode="outlined" onPress={showDateHandler} icon="calendar" style={{ marginBottom: 10 }}>
              {date.toLocaleDateString()} | {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Button>

            {showPicker && Platform.OS === 'ios' && (
              <DateTimePicker value={date} mode="datetime" display="spinner" onChange={onDateChange} />
            )}

            <Button mode="contained" onPress={saveLog} style={{ backgroundColor: '#6200ee' }}>မှတ်တမ်းသိမ်းမည်</Button>
          </Card.Content>
        </Card>

        {/* Chart Card */}
        <Text style={styles.sectionTitle}>📊 ခြုံငုံသုံးသပ်ချက် (Trends)</Text>
        <Card style={styles.card}>
          <Card.Content>
            {isPremium ? (
              chartData.data.length > 0 ? (
                <LineChart 
                  data={{ labels: chartData.labels, datasets: [{ data: chartData.data }] }} 
                  width={screenWidth - 60} 
                  height={220} 
                  chartConfig={chartConfig} 
                  bezier 
                  style={{ borderRadius: 16 }} 
                />
              ) : <Text style={{ textAlign: 'center' }}>ဒေတာ မလုံလောက်သေးပါ</Text>
            ) : (
              <View style={{ alignItems: 'center', padding: 10 }}>
                <Text style={{ color: 'grey', marginBottom: 10 }}>Premium ဝယ်ယူပြီး Chart ကြည့်ပါ။</Text>
                <Button onPress={() => setPaymentModal(true)}>Unlock Premium</Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Logs List */}
        <Text style={styles.sectionTitle}>📋 ယခင်မှတ်တမ်းများ</Text>
        {logs.map((item) => {
          const status = getStatus(item.level, item.mealType);
          return (
            <List.Item 
              key={item.id} 
              title={`${item.level} mg/dL`} 
              description={`${status.label} | ${item.mealType === 'fasting' ? 'အစာမစားခင်' : 'စားပြီး'} \n${item.dateString} ${item.timeString}`}
              left={props => <List.Icon {...props} icon="water" color={status.color} />}
              style={styles.listItem}
              descriptionNumberOfLines={2}
            />
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={paymentModal} onRequestClose={() => setPaymentModal(false)} animationType="slide">
        <View style={styles.modalContainer}>
          <Appbar.Header style={{ backgroundColor: 'white' }}>
            <Appbar.BackAction onPress={() => setPaymentModal(false)} />
            <Appbar.Content title="Upgrade Premium" />
          </Appbar.Header>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text variant="headlineSmall" style={styles.priceTag}>5,000 Ks / Lifetime</Text>
            <Text style={styles.modalSubText}>QR ငွေလွှဲပြီး Telegram သို့ Screenshot ပို့ပေးပါ။</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qrScroll}>
               <View style={styles.qrWrapper}>
                  <Text style={styles.qrTitle}>KBZPay</Text>
                  <Image source={require('../assets/images/kbzpay.jpg')} style={styles.qrImage} resizeMode="contain" />
               </View>
               <View style={styles.qrWrapper}>
                  <Text style={styles.qrTitle}>CBPay</Text>
                  <Image source={require('../assets/images/cbpay.jpg')} style={styles.qrImage} resizeMode="contain" />
               </View>
            </ScrollView>

            <Button mode="contained" onPress={handleSendToTelegram} icon="send" style={styles.confirmButton}>
              ငွေလွှဲပြီး Telegram သို့ သွားမည်
            </Button>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const chartConfig = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#6200ee" }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  card: { marginVertical: 5, borderRadius: 12, backgroundColor: 'white', elevation: 2 },
  radioGroup: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  referenceText: { backgroundColor: '#e3f2fd', padding: 8, borderRadius: 6, color: '#1565c0', marginBottom: 15, textAlign: 'center', fontSize: 12 },
  sectionTitle: { marginTop: 20, fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  listItem: { backgroundColor: 'white', marginTop: 8, borderRadius: 10, borderLeftWidth: 5, borderLeftColor: '#6200ee' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalContent: { padding: 20, alignItems: 'center' },
  priceTag: { fontWeight: 'bold', color: '#6200ee', marginBottom: 10 },
  modalSubText: { color: 'grey', marginBottom: 20, textAlign: 'center' },
  qrScroll: { marginBottom: 20 },
  qrWrapper: { alignItems: 'center', marginRight: 15, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 15 },
  qrTitle: { fontWeight: 'bold', marginBottom: 5 },
  qrImage: { width: 200, height: 200 },
  confirmButton: { width: '100%', backgroundColor: '#4CAF50', paddingVertical: 5 }
})