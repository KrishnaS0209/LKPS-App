class UserModel {
  final String? sid;
  final String? tid;
  final String? name;
  final String? fn;
  final String? ln;
  final String? cls;
  final String? roll;
  final String? father;
  final String? fphone;
  final String? mphone;
  final String? ph;
  final String? fee;
  final String? fst;
  final String? username;

  UserModel({
    this.sid,
    this.tid,
    this.name,
    this.fn,
    this.ln,
    this.cls,
    this.roll,
    this.father,
    this.fphone,
    this.mphone,
    this.ph,
    this.fee,
    this.fst,
    this.username,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      sid: json['sid'],
      tid: json['tid'],
      name: json['name'],
      fn: json['fn'],
      ln: json['ln'],
      cls: json['cls'],
      roll: json['roll'],
      father: json['father'],
      fphone: json['fphone'],
      mphone: json['mphone'],
      ph: json['ph'],
      fee: json['fee'],
      fst: json['fst'],
      username: json['username'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sid': sid,
      'tid': tid,
      'name': name,
      'fn': fn,
      'ln': ln,
      'cls': cls,
      'roll': roll,
      'father': father,
      'fphone': fphone,
      'mphone': mphone,
      'ph': ph,
      'fee': fee,
      'fst': fst,
      'username': username,
    };
  }

  String get displayName {
    if (name != null && name!.isNotEmpty) return name!;
    if (fn != null || ln != null) {
      return [fn, ln].where((e) => e != null && e.isNotEmpty).join(' ');
    }
    return username ?? 'User';
  }
}
