import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ScrollView, Alert, TextInput, TouchableOpacity, Switch, Linking, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import { WebView } from 'react-native-webview';

export default function App() {
  const [aba, setAba] = useState('biblioteca');
  const [livros, setLivros] = useState([]);
  const [livroAtual, setLivroAtual] = useState(null);
  const [texto, setTexto] = useState('Clique em ADICIONAR LIVRO para começar.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [rate, setRate] = useState(0.9);
  const [vozes, setVozes] = useState([]);
  const [vozSelecionada, setVozSelecionada] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [chatUrl, setChatUrl] = useState('https://chat.openai.com/');

  useEffect(() => {
    Speech.getAvailableVoicesAsync().then(v => {
      const pt = v.filter(x => x.language.startsWith('pt'));
      setVozes(pt);
      setVozSelecionada(pt.find(x => x.language === 'pt-BR')?.identifier || pt[0]?.identifier);
    });
    carregarLivros();
  }, []);

  const carregarLivros = async () => {
    const salvos = await AsyncStorage.getItem('biblioteca_v3');
    if (salvos) setLivros(JSON.parse(salvos));
  };

  const salvarLivros = async (novaLista) => {
    setLivros(novaLista);
    await AsyncStorage.setItem('biblioteca_v3', JSON.stringify(novaLista));
  };

  const handleFilePicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain']
    });
    if (!result.canceled) {
      const novoLivro = {
        id: Date.now(),
        nome: result.assets[0].name,
        uri: result.assets[0].uri,
        progresso: 0,
        capa: null
      };
      salvarLivros([...livros, novoLivro]);
      abrirLivro(novoLivro);
    }
  };

  const tirarFotoCapa = async (livroId) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status!== 'granted') {
      Alert.alert('Permissão', 'Precisa liberar a câmera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) {
      const novaLista = livros.map(l => l.id === livroId? {...l, capa: result.assets[0].uri } : l);
      salvarLivros(novaLista);
      if (livroAtual?.id === livroId) setLivroAtual({...livroAtual, capa: result.assets[0].uri });
    }
  };

  const abrirLivro = async (livro) => {
    setLivroAtual(livro);
    if (livro.nome.endsWith('.txt')) {
      const txt = await FileSystem.readAsStringAsync(livro.uri);
      setTexto(txt);
    } else if (livro.nome.endsWith('.pdf')) {
      setTexto('PDF_CARREGADO');
    }
  };

  const handleSpeak = () => {
    if (texto === 'PDF_CARREGADO') {
      Alert.alert('Aviso', 'TTS não lê PDF direto. Converte pra TXT em ilovepdf.com');
      return;
    }
    setIsSpeaking(true);
    Speech.speak(texto, {
      language: 'pt-BR', rate, pitch: 1.0, voice: vozSelecionada,
      onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false),
    });
  };

  const falarComIA = () => {
    const prompt = `Contexto: Estou lendo "${livroAtual?.nome || 'um livro'}". Me ajuda: `;
    setChatUrl(`https://chat.openai.com/?q=${encodeURIComponent(prompt)}`);
    setAba('iachat');
  };

  const buscarNoGoogle = () => {
    if (!termoBusca) return;
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(termoBusca + ' filetype:pdf')}`);
  };

  const tema = { bg: isDark? '#121212' : '#f5f5f5', text: isDark? '#fff' : '#000', card: isDark? '#1e1e1e' : '#fff' };

  if (aba === 'iachat') {
    return (
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: tema.bg }}>
        <View style={styles.chatHeader}>
          <Button title="← Voltar" onPress={() => setAba('biblioteca')} />
          <Text style={[styles.chatTitle, { color: tema.text }]}>IA Chat</Text>
          <Button title="Gemini" onPress={() => setChatUrl('https://gemini.google.com/')} />
        </View>
        <WebView source={{ uri: chatUrl }} style={{ flex: 1 }} />
      </View>
    );
  }

  if (aba === 'pesquisa') {
    return (
      <View style={[styles.container, { backgroundColor: tema.bg }]}>
        <Text style={[styles.title, { color: tema.text }]}>Pesquisar</Text>
        <TextInput
          style={[styles.input, { backgroundColor: tema.card, color: tema.text }]}
          placeholder="Nome do livro..."
          placeholderTextColor="#999"
          value={termoBusca}
          onChangeText={setTermoBusca}
        />
        <Button title="BUSCAR PDF NO GOOGLE" onPress={buscarNoGoogle} />
        <Button title="FALAR COM IA" onPress={falarComIA} color="#34C759" />
        <View style={styles.tabBar}>
          <Button title="Biblioteca" onPress={() => setAba('biblioteca')} />
          <Button title="IA Chat" onPress={() => setAba('iachat')} />
          <Button title="Ferramentas" onPress={() => setAba('ferramentas')} />
        </View>
      </View>
    );
  }

  if (aba === 'ferramentas') {
    return (
      <View style={[styles.container, { backgroundColor: tema.bg }]}>
        <Text style={[styles.title, { color: tema.text }]}>Ferramentas</Text>
        <View style={styles.row}>
          <Text style={{ color: tema.text }}>Modo Escuro</Text>
          <Switch value={isDark} onValueChange={setIsDark} />
        </View>
        <Text style={[styles.label, { color: tema.text }]}>Velocidade: {rate.toFixed(1)}</Text>
        <View style={styles.row}>
          <Button title="-" onPress={() => setRate(Math.max(0.1, rate - 0.1))} />
          <Button title="+" onPress={() => setRate(Math.min(2.0, rate + 0.1))} />
        </View>
        <View style={styles.tabBar}>
          <Button title="Biblioteca" onPress={() => setAba('biblioteca')} />
          <Button title="Pesquisa" onPress={() => setAba('pesquisa')} />
          <Button title="IA Chat" onPress={() => setAba('iachat')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.bg }]}>
      <Text style={[styles.title, { color: tema.text }]}>Leitor Pro Max</Text>
      <Button title="ADICIONAR LIVRO PDF/TXT" onPress={handleFilePicker} />
      {livroAtual? (
        <>
          <View style={styles.livroHeader}>
            {livroAtual.capa && <Image source={{ uri: livroAtual.capa }} style={styles.capa} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.livroAtual, { color: tema.text }]}>{livroAtual.nome}</Text>
              <Button title="Foto da Capa" onPress={() => tirarFotoCapa(livroAtual.id)} />
            </View>
          </View>
          <View style={styles.row}>
            {isSpeaking? (
              <Button title="⏹️ PARAR" onPress={() => { Speech.stop(); setIsSpeaking(false); }} color="#dc3545" />
            ) : (
              <Button title="▶️ LER" onPress={handleSpeak} color="#28a745" />
            )}
            <Button title="IA" onPress={falarComIA} color="#5856D6" />
            <Button title="Voltar" onPress={() => setLivroAtual(null)} />
          </View>
          {texto === 'PDF_CARREGADO'? (
            <Pdf source={{ uri: livroAtual.uri }} style={styles.pdf} />
          ) : (
            <ScrollView style={[styles.textContainer, { backgroundColor: tema.card }]}>
              <Text style={{ color: tema.text }} selectable>{texto}</Text>
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView>
          {livros.map((l) => (
            <TouchableOpacity key={l.id} style={[styles.livroItem, { backgroundColor: tema.card }]} onPress={() => abrirLivro(l)}>
              {l.capa && <Image source={{ uri: l.capa }} style={styles.capaMini} />}
              <Text style={{ color: tema.text, flex: 1 }}>{l.nome}</Text>
            </TouchableOpacity>
          ))}
          {livros.length === 0 && <Text style={[styles.aviso, { color: tema.text }]}>Nenhum livro ainda. Clica em ADICIONAR.</Text>}
        </ScrollView>
      )}
      <View style={styles.tabBar}>
        <Button title="Pesquisa" onPress={() => setAba('pesquisa')} />
        <Button title="IA Chat" onPress={() => setAba('iachat')} />
        <Button title="Ferramentas" onPress={() => setAba('ferramentas')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  input: { padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 10, flexWrap: 'wrap' },
  label: { fontSize: 16, marginTop: 10, marginBottom: 5 },
  livroHeader: { flexDirection: 'row', marginVertical: 10, alignItems: 'center' },
  capa: { width: 60, height: 90, borderRadius: 4, marginRight: 10 },
  capaMini: { width: 30, height: 45, borderRadius: 3, marginRight: 10 },
  livroAtual: { fontSize: 14, fontWeight: 'bold' },
  textContainer: { flex: 1, padding: 15, borderRadius: 8, marginTop: 10 },
  pdf: { flex: 1, width: '100%', marginTop: 10 },
  livroItem: { padding: 12, borderRadius: 8, marginVertical: 5, flexDirection: 'row', alignItems: 'center' },
  aviso: { textAlign: 'center', marginTop: 50, fontSize: 16 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderColor: '#ccc' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10 },
  chatTitle: { fontSize: 18, fontWeight: 'bold' },
});
